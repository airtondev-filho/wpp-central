import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { io } from '../index.js'
import { registrarFinalizacao, obterPontosConfigurados } from '../gamificacao/servico.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/atendimentos — lista com filtros
router.get('/', requireAuth, async (req, res) => {
  const { status, prioridade, grupoJid, agenteId, redirecionadoPendente } = req.query

  const where = {}
  if (status)     where.status     = { in: status.split(',') }
  if (prioridade) where.prioridade = { in: prioridade.split(',') }
  if (grupoJid)   where.grupoJid   = grupoJid
  if (agenteId)   where.agenteId   = Number(agenteId)
  if (redirecionadoPendente !== undefined) where.redirecionadoPendente = redirecionadoPendente === 'true'

  const atends = await prisma.atendimento.findMany({
    where,
    include: { grupo: true, agente: { select: { id: true, nome: true, avatar: true, molduraEquipada: true } } },
    orderBy: [
      { prioridade: 'desc' },
      { aberturaEm: 'asc' }
    ]
  })

  const now = Date.now()
  const result = atends.map(a => ({
    ...a,
    ultimoTimestamp: Number(a.ultimoTimestamp),
    minutosAberto: Math.floor((now - new Date(a.aberturaEm).getTime()) / 60000)
  }))

  res.json(result)
})

// GET /api/atendimentos/stats/redirecionamentos — quantos atendimentos foram
// redirecionados para o usuário logado por semana (últimas 8), + taxa de
// resposta dentro do prazo (para o velocímetro de desempenho)
router.get('/stats/redirecionamentos', requireAuth, async (req, res) => {
  const userId = req.user.id
  const SEMANAS = 8
  const desde = new Date()
  desde.setDate(desde.getDate() - SEMANAS * 7)

  const inicioSemana = (data) => {
    const d = new Date(data)
    const dia = d.getDay() // 0=domingo
    d.setDate(d.getDate() + ((dia === 0 ? -6 : 1) - dia)) // volta pra segunda-feira
    d.setHours(0, 0, 0, 0)
    return d
  }

  const eventos = await prisma.historicoAtendimento.findMany({
    where: { tipo: 'AGENTE_CHANGE', para: String(userId), criadoEm: { gte: desde } },
    select: { criadoEm: true }
  })

  const buckets = new Map()
  for (let i = SEMANAS - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    buckets.set(inicioSemana(d).toISOString().slice(0, 10), 0)
  }
  for (const ev of eventos) {
    const chave = inicioSemana(ev.criadoEm).toISOString().slice(0, 10)
    if (buckets.has(chave)) buckets.set(chave, buckets.get(chave) + 1)
  }
  const porSemana = [...buckets.entries()].map(([semana, total]) => ({ semana, total }))

  const ledger = await prisma.pontosHistorico.findMany({
    where: {
      userId,
      motivo: { in: ['REDIRECIONAMENTO_RESPONDIDO', 'REDIRECIONAMENTO_EXPIRADO'] },
      criadoEm: { gte: desde }
    },
    select: { motivo: true }
  })
  const respondidos = ledger.filter(l => l.motivo === 'REDIRECIONAMENTO_RESPONDIDO').length
  const expirados   = ledger.filter(l => l.motivo === 'REDIRECIONAMENTO_EXPIRADO').length
  const totalAvaliados = respondidos + expirados
  const percentual = totalAvaliados ? Math.round((respondidos / totalAvaliados) * 100) : null
  const nivel = percentual === null ? 'SEM_DADOS' : percentual >= 70 ? 'BOM' : percentual >= 40 ? 'MEDIO' : 'RUIM'

  const pendentesAtuais = await prisma.atendimento.count({ where: { agenteId: userId, redirecionadoPendente: true } })

  res.json({ porSemana, respondidos, expirados, pendentesAtuais, percentual, nivel })
})

// GET /api/atendimentos/:id — detalhes + histórico + mensagens
router.get('/:id', requireAuth, async (req, res) => {
  const atend = await prisma.atendimento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      grupo: true,
      agente: { select: { id: true, nome: true, avatar: true, molduraEquipada: true } },
      mensagens: {
        orderBy: { timestamp: 'desc' }, take: 100,
        include: { agente: { select: { id: true, nome: true, avatar: true } } }
      },
      historico: { orderBy: { criadoEm: 'asc' } }
    }
  })
  if (!atend) return res.status(404).json({ error: 'Não encontrado' })
  res.json({ ...atend, ultimoTimestamp: Number(atend.ultimoTimestamp), mensagens: atend.mensagens.reverse() })
})

// POST /api/atendimentos/:id/finalizar
router.post('/:id/finalizar', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const atend = await prisma.atendimento.update({
    where: { id },
    data: { status: 'FINALIZADO', finalizadoEm: new Date(), finalizadoPor: req.user.nome }
  })
  await prisma.historicoAtendimento.create({
    data: { atendId: id, tipo: 'STATUS_CHANGE', de: 'ABERTO', para: 'FINALIZADO',
      descricao: `Finalizado por ${req.user.nome}` }
  })
  io.emit('atendimento_updated', { atendId: id })
  registrarFinalizacao(atend).catch(err => console.error('Erro ao registrar gamificação:', err))
  res.json({ ok: true })
})

// POST /api/atendimentos/:id/reabrir
router.post('/:id/reabrir', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  await prisma.atendimento.update({
    where: { id },
    data: { status: 'ABERTO', finalizadoEm: null, finalizadoPor: null, prioridade: 'NORMAL', aberturaEm: new Date() }
  })
  io.emit('atendimento_updated', { atendId: id })
  res.json({ ok: true })
})

// PATCH /api/atendimentos/:id/prioridade
router.patch('/:id/prioridade', requireRole('ADMIN','SUPERVISOR'), async (req, res) => {
  const id = Number(req.params.id)
  const { prioridade } = req.body
  const old = await prisma.atendimento.findUnique({ where: { id }, select: { prioridade: true } })
  await prisma.atendimento.update({ where: { id }, data: { prioridade } })
  await prisma.historicoAtendimento.create({
    data: { atendId: id, tipo: 'PRIORIDADE_CHANGE', de: old.prioridade, para: prioridade,
      descricao: `Alterado manualmente por ${req.user.nome}` }
  })
  io.emit('atendimento_updated', { atendId: id })
  res.json({ ok: true })
})

// PATCH /api/atendimentos/:id/agente
router.patch('/:id/agente', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const { agenteId } = req.body
  await prisma.atendimento.update({ where: { id }, data: { agenteId: agenteId || null, status: 'EM_ATENDIMENTO' } })
  io.emit('atendimento_updated', { atendId: id })
  res.json({ ok: true })
})

// POST /api/atendimentos/:id/redirecionar — admin/supervisor direciona o
// atendimento para um agente, com prazo e pontuação (bônus/penalidade)
router.post('/:id/redirecionar', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const id = Number(req.params.id)
  const { agenteId } = req.body
  if (!agenteId) return res.status(400).json({ error: 'agenteId obrigatório' })

  const old = await prisma.atendimento.findUnique({ where: { id }, select: { agenteId: true } })
  if (!old) return res.status(404).json({ error: 'Não encontrado' })

  await prisma.atendimento.update({
    where: { id },
    data: {
      agenteId: Number(agenteId),
      status: 'EM_ATENDIMENTO',
      redirecionadoEm: new Date(),
      redirecionadoPendente: true,
      redirecionadoPorId: req.user.id
    }
  })
  await prisma.historicoAtendimento.create({
    data: {
      atendId: id, tipo: 'AGENTE_CHANGE',
      de: old.agenteId ? String(old.agenteId) : null, para: String(agenteId),
      descricao: `Redirecionado por ${req.user.nome}`
    }
  })

  const { redirecionamento_prazo_minutos: prazo } = await obterPontosConfigurados()
  await prisma.notificacao.create({
    data: {
      userId: Number(agenteId),
      tipo: 'REDIRECIONAMENTO',
      titulo: 'Atendimento redirecionado para você',
      corpo: `${req.user.nome} redirecionou um atendimento — responda em até ${prazo} min para ganhar pontos.`,
      atendId: id
    }
  })

  io.emit('atendimento_updated', { atendId: id })
  io.to(`user:${agenteId}`).emit('notificacao')
  res.json({ ok: true })
})

export default router
