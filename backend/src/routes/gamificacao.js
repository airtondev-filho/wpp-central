import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { nivelDe, progresso } from '../gamificacao/regras.js'
import { obterNiveisConfigurados } from '../gamificacao/config.js'
import { BADGES } from '../gamificacao/badges.js'
import { MISSOES } from '../gamificacao/missoes.js'
import { registrarEasterEggPequenino, registrarEasterEggIdosoMaster } from '../gamificacao/servico.js'

const router = Router()
const prisma = new PrismaClient()

const usuarioSelect = { id: true, nome: true, email: true, role: true, numero: true, avatar: true, pontos: true, molduraEquipada: true, tituloEquipado: true, bannerEquipado: true }

async function montarPerfil(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: usuarioSelect })
  if (!user) return null

  const desbloqueadas = await prisma.userBadge.findMany({ where: { userId } })
  const desbloqueadasMap = new Map(desbloqueadas.map(b => [b.badgeSlug, b.desbloqueadoEm]))

  const missoesFeitas = await prisma.userMissao.findMany({ where: { userId } })
  const missoesMap = new Map(missoesFeitas.map(m => [m.missaoSlug, m.desbloqueadoEm]))

  const baus = await prisma.userBau.findMany({ where: { userId } })
  const bauMap = new Map(baus.map(b => [b.missaoSlug, b]))

  const historico = await prisma.pontosHistorico.findMany({
    where: { userId }, orderBy: { criadoEm: 'desc' }, take: 20
  })

  // Badges "oculta" (easter eggs) só aparecem na lista depois de desbloqueadas —
  // até lá, nome/descrição/critério continuam secretos.
  const badges = BADGES
    .filter(b => !b.oculta || desbloqueadasMap.has(b.slug))
    .map(({ slug, nome, descricao, icone }) => ({
      slug, nome, descricao, icone,
      desbloqueado: desbloqueadasMap.has(slug),
      desbloqueadoEm: desbloqueadasMap.get(slug) || null
    }))

  const missoes = []
  for (const m of MISSOES) {
    const concluida = missoesMap.has(m.slug)
    const atual = concluida ? m.meta : await m.progresso(prisma, userId)
    missoes.push({
      slug: m.slug, nome: m.nome, descricao: m.descricao, icone: m.icone, meta: m.meta,
      progresso: Math.min(atual, m.meta),
      desbloqueado: concluida,
      desbloqueadoEm: missoesMap.get(m.slug) || null
    })
  }

  // Baú aberto é o que de fato libera título/banner/moldura de uma missão —
  // concluir a missão só garante o baú (fechado).
  const recompensasAbertas = new Set(baus.filter(b => b.abertoEm).map(b => b.missaoSlug))

  const molduras = [
    ...badges.filter(b => b.desbloqueado).map(b => ({ slug: b.slug, nome: b.nome, origem: 'badge' })),
    ...missoes.filter(m => recompensasAbertas.has(m.slug)).map(m => ({ slug: m.slug, nome: m.nome, origem: 'missão' })),
  ]

  const titulos = missoes.filter(m => recompensasAbertas.has(m.slug))
    .map(({ slug, nome, descricao }) => ({ slug, nome, descricao }))

  // Banners: liberados por missão (baú), e também por badge (ex.: Primeiro Passo).
  const banners = [
    ...badges.filter(b => b.desbloqueado).map(({ slug, nome, descricao }) => ({ slug, nome, descricao })),
    ...titulos,
  ]

  const baúsList = MISSOES.map(m => {
    const bau = bauMap.get(m.slug)
    if (!bau) return null
    return { slug: m.slug, nome: m.nome, descricao: m.descricao, icone: m.icone, ganhoEm: bau.ganhoEm, aberto: !!bau.abertoEm, abertoEm: bau.abertoEm }
  }).filter(Boolean)

  const niveis = await obterNiveisConfigurados()

  return {
    pontos: user.pontos,
    nivel: nivelDe(user.pontos, niveis).nome,
    progresso: progresso(user.pontos, niveis),
    badges,
    missoes,
    baus: baúsList,
    molduras,
    titulos,
    banners,
    molduraEquipada: user.molduraEquipada,
    tituloEquipado: user.tituloEquipado,
    bannerEquipado: user.bannerEquipado,
    historico
  }
}

router.get('/me', requireAuth, async (req, res) => {
  res.json(await montarPerfil(req.user.id))
})

router.get('/:userId', requireAuth, async (req, res) => {
  const userId = Number(req.params.userId)
  if (userId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  const perfil = await montarPerfil(userId)
  if (!perfil) return res.status(404).json({ error: 'Não encontrado' })
  res.json(perfil)
})

// POST /api/gamificacao/bau/:slug/abrir — abre um baú ganho ao concluir uma missão,
// liberando título, banner e moldura daquela missão para equipar
router.post('/bau/:slug/abrir', requireAuth, async (req, res) => {
  const { slug } = req.params
  const bau = await prisma.userBau.findUnique({ where: { userId_missaoSlug: { userId: req.user.id, missaoSlug: slug } } })
  if (!bau) return res.status(404).json({ error: 'Baú não encontrado' })
  if (bau.abertoEm) return res.status(400).json({ error: 'Este baú já foi aberto' })

  await prisma.userBau.update({ where: { id: bau.id }, data: { abertoEm: new Date() } })
  res.json(await montarPerfil(req.user.id))
})

// PATCH /api/gamificacao/equipar — equipar (ou remover, slug=null) moldura, título ou banner desbloqueado
router.patch('/equipar', requireAuth, async (req, res) => {
  const { tipo, slug } = req.body
  const campoPorTipo = { moldura: 'molduraEquipada', titulo: 'tituloEquipado', banner: 'bannerEquipado' }
  const campo = campoPorTipo[tipo]
  if (!campo) return res.status(400).json({ error: 'Tipo inválido' })

  if (slug) {
    const bau = await prisma.userBau.findUnique({ where: { userId_missaoSlug: { userId: req.user.id, missaoSlug: slug } } })
    const bauAberto = !!bau?.abertoEm

    let ok = bauAberto
    if ((tipo === 'moldura' || tipo === 'banner') && !ok) {
      ok = !!(await prisma.userBadge.findUnique({ where: { userId_badgeSlug: { userId: req.user.id, badgeSlug: slug } } }))
    }
    if (!ok) return res.status(400).json({ error: 'Item não desbloqueado' })
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { [campo]: slug || null },
    select: usuarioSelect
  })
  res.json(user)
})

// POST /api/gamificacao/pequenino — easter egg "O Pequenino", acionado pelo
// front ao clicar 20 vezes no agente de número 556299320983 na tela de Agentes
router.post('/pequenino', requireAuth, async (req, res) => {
  await registrarEasterEggPequenino(req.user.id)
  res.json(await montarPerfil(req.user.id))
})

// POST /api/gamificacao/idoso-master — easter egg "IDOSO MASTER MEME", acionado
// pelo front ao clicar 20 vezes no agente de número 556282386452 na tela de Agentes
router.post('/idoso-master', requireAuth, async (req, res) => {
  await registrarEasterEggIdosoMaster(req.user.id)
  res.json(await montarPerfil(req.user.id))
})

export default router
