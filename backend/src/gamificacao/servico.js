import { PrismaClient } from '@prisma/client'
import { io } from '../index.js'
import { calcularPontos, nivelDe, PONTOS_PADRAO } from './regras.js'
import { obterNiveisConfigurados } from './config.js'
import { BADGES } from './badges.js'
import { MISSOES } from './missoes.js'

const prisma = new PrismaClient()

// Lê os pontos configurados pelo super admin em Configurações (tela Config /
// tabela Config), com fallback para o padrão de cada ação quando ainda não
// foi configurado.
export async function obterPontosConfigurados() {
  const chaves = Object.keys(PONTOS_PADRAO)
  const linhas = await prisma.config.findMany({ where: { chave: { in: chaves } } })
  const configurado = Object.fromEntries(linhas.map(l => [l.chave, Number(l.valor)]))
  return { ...PONTOS_PADRAO, ...configurado }
}

// Mesmo critério de ordenação do ranking em /api/stats — quem está no topo por
// volume de atendimentos, não por pontos (são métricas independentes).
async function ehPrimeiroNoRanking(agenteId) {
  const top = await prisma.user.findFirst({
    where: { ativo: true, role: { in: ['AGENTE', 'SUPERVISOR', 'ADMIN'] } },
    select: { id: true },
    orderBy: { atendimentos: { _count: 'desc' } }
  })
  return top?.id === agenteId
}

// Credita (ou debita, se `pts` for negativo) pontos a um agente por uma ação
// (atendimento, reunião, requisição, redirecionamento...), registra o histórico
// (idempotente por motivo + referência), atualiza nível, badges, missões e
// notifica em tempo real. `referencia` é { atendimentoId } ou { requisicaoId }
// ou { treinamentoId }, usado para não premiar/penalizar duas vezes o mesmo
// evento. `User.pontos` nunca fica negativo.
async function creditarPontos(agenteId, pts, motivo, referencia = {}, tituloParabens = 'Parabéns!') {
  if (!agenteId || pts === 0) return

  try {
    await prisma.pontosHistorico.create({
      data: { userId: agenteId, pontos: pts, motivo, ...referencia }
    })
  } catch (err) {
    if (err.code === 'P2002') return // já processado para este evento
    throw err
  }

  const atual = await prisma.user.findUnique({ where: { id: agenteId }, select: { pontos: true } })
  const pontosAntes = atual.pontos
  const user = await prisma.user.update({
    where: { id: agenteId },
    data: { pontos: Math.max(0, pontosAntes + pts) },
    select: { pontos: true }
  })

  const niveis = await obterNiveisConfigurados()
  const nivelAnterior = nivelDe(pontosAntes, niveis).nome
  const nivelAtual = nivelDe(user.pontos, niveis).nome
  const subiuDeNivel = nivelAnterior !== nivelAtual

  const jaDesbloqueadas = new Set(
    (await prisma.userBadge.findMany({ where: { userId: agenteId }, select: { badgeSlug: true } }))
      .map(b => b.badgeSlug)
  )

  const novasBadges = []
  for (const badge of BADGES) {
    if (jaDesbloqueadas.has(badge.slug)) continue
    if (await badge.check(prisma, agenteId)) novasBadges.push(badge)
  }

  if (novasBadges.length) {
    await prisma.userBadge.createMany({
      data: novasBadges.map(b => ({ userId: agenteId, badgeSlug: b.slug })),
      skipDuplicates: true
    })
  }

  const jaMissoes = new Set(
    (await prisma.userMissao.findMany({ where: { userId: agenteId }, select: { missaoSlug: true } }))
      .map(m => m.missaoSlug)
  )

  const novasMissoes = []
  for (const missao of MISSOES) {
    if (jaMissoes.has(missao.slug)) continue
    if ((await missao.progresso(prisma, agenteId)) >= missao.meta) novasMissoes.push(missao)
  }

  if (novasMissoes.length) {
    await prisma.userMissao.createMany({
      data: novasMissoes.map(m => ({ userId: agenteId, missaoSlug: m.slug })),
      skipDuplicates: true
    })
    // Baú fechado — título, banner e moldura da missão só liberam quando o agente abrir
    await prisma.userBau.createMany({
      data: novasMissoes.map(m => ({ userId: agenteId, missaoSlug: m.slug })),
      skipDuplicates: true
    })
  }

  if (pts !== 0 || novasBadges.length || novasMissoes.length) {
    // Uma penalidade (pts < 0) nunca é tratada como "subiu de nível", mesmo que
    // o nível tenha mudado (nesse caso, caiu).
    const subiuDeNivelPositivo = pts > 0 && subiuDeNivel
    const primeiroColocado = subiuDeNivelPositivo && await ehPrimeiroNoRanking(agenteId)

    const partes = []
    if (pts > 0) partes.push(`+${pts} pontos`)
    else if (pts < 0) partes.push(`${pts} pontos`)
    if (novasBadges.length) partes.push(...novasBadges.map(b => `conquista "${b.nome}"`))
    if (novasMissoes.length) partes.push(...novasMissoes.map(m => `missão "${m.nome}" · baú ganho`))
    await prisma.notificacao.create({
      data: {
        userId: agenteId,
        tipo: 'GAMIFICACAO',
        titulo: primeiroColocado ? `Nº1 do ranking e nível ${nivelAtual}!`
              : subiuDeNivelPositivo ? `Você subiu para o nível ${nivelAtual}!`
              : tituloParabens,
        corpo: partes.join(' · ')
      }
    })

    io.to(`user:${agenteId}`).emit('gamificacao_conquista', {
      pontosGanhos: pts,
      pontosTotal: user.pontos,
      nivelAnterior,
      nivelAtual,
      subiuDeNivel: subiuDeNivelPositivo,
      primeiroColocado,
      badgesDesbloqueados: novasBadges.map(({ slug, nome, descricao, icone }) => ({ slug, nome, descricao, icone })),
      missoesConcluidas: novasMissoes.map(({ slug, nome, descricao, icone }) => ({ slug, nome, descricao, icone }))
    })
  }
}

// Chamado logo após um atendimento ser finalizado. `atend` é o registro
// já atualizado (retorno do prisma.atendimento.update), evitando query extra.
export async function registrarFinalizacao(atend) {
  if (!atend.agenteId) return
  const { pontos_atendimento } = await obterPontosConfigurados()
  const pts = calcularPontos(atend, pontos_atendimento)
  await creditarPontos(atend.agenteId, pts, 'ATENDIMENTO_FINALIZADO', { atendimentoId: atend.id }, 'Parabéns pelo atendimento!')
}

// Chamado logo após uma requisição ser cadastrada, premiando quem a criou.
export async function registrarRequisicaoCadastrada(requisicao) {
  const { pontos_requisicao } = await obterPontosConfigurados()
  await creditarPontos(requisicao.criadorId, pontos_requisicao, 'REQUISICAO_CADASTRADA', { requisicaoId: requisicao.id }, 'Parabéns pela requisição cadastrada!')
}

// Chamado quando um participante conclui um treinamento/reunião.
export async function registrarReuniaoConcluida(treinamentoId, userId) {
  const { pontos_reuniao } = await obterPontosConfigurados()
  await creditarPontos(userId, pontos_reuniao, 'TREINAMENTO_CONCLUIDO', { treinamentoId }, 'Parabéns pela reunião concluída!')
}

// Chamado quando o agente responde um atendimento que estava redirecionado
// pendente para ele. `atend` é o registro já atualizado (com
// redirecionadoPendente = false).
export async function registrarRedirecionamentoRespondido(atend) {
  if (!atend.agenteId) return
  const { redirecionamento_bonus } = await obterPontosConfigurados()
  await creditarPontos(atend.agenteId, redirecionamento_bonus, 'REDIRECIONAMENTO_RESPONDIDO',
    { atendimentoId: atend.id }, 'Você respondeu o atendimento redirecionado!')
}

// Chamado pelo job de redirecionamento quando o prazo expira sem resposta.
export async function registrarRedirecionamentoExpirado(atend) {
  if (!atend.agenteId) return
  const { redirecionamento_penalidade } = await obterPontosConfigurados()
  await creditarPontos(atend.agenteId, -redirecionamento_penalidade, 'REDIRECIONAMENTO_EXPIRADO',
    { atendimentoId: atend.id }, 'Atendimento redirecionado sem resposta a tempo')
}

// Easter eggs de badges — concedidos manualmente (fora do fluxo de
// creditarPontos, já que não estão atrelados a nenhuma ação que gere pontos),
// disparados pelo front quando o usuário clica 20 vezes em um agente
// específico na tela de Agentes. Idempotente: clique repetido não gera
// badge nem notificação duplicada.
async function registrarEasterEgg(userId, badgeSlug) {
  const badge = BADGES.find(b => b.slug === badgeSlug)

  const criada = await prisma.userBadge.createMany({
    data: [{ userId, badgeSlug: badge.slug }],
    skipDuplicates: true
  })
  if (criada.count === 0) return // já desbloqueada

  await prisma.notificacao.create({
    data: {
      userId,
      tipo: 'GAMIFICACAO',
      titulo: 'Parabéns!',
      corpo: `conquista "${badge.nome}"`
    }
  })

  io.to(`user:${userId}`).emit('gamificacao_conquista', {
    pontosGanhos: 0,
    pontosTotal: (await prisma.user.findUnique({ where: { id: userId }, select: { pontos: true } })).pontos,
    nivelAnterior: null,
    nivelAtual: null,
    subiuDeNivel: false,
    primeiroColocado: false,
    badgesDesbloqueados: [{ slug: badge.slug, nome: badge.nome, descricao: badge.descricao, icone: badge.icone }],
    missoesConcluidas: []
  })
}

// Clique 20x no agente de número 556299320983 na tela de Agentes.
export const registrarEasterEggPequenino = (userId) => registrarEasterEgg(userId, 'o_pequenino')

// Clique 20x no agente de número 556282386452 na tela de Agentes.
export const registrarEasterEggIdosoMaster = (userId) => registrarEasterEgg(userId, 'idoso_master_meme')
