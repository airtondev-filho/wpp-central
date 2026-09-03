import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { nivelDe } from '../gamificacao/regras.js'
import { obterNiveisConfigurados } from '../gamificacao/config.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAuth, async (req, res) => {
  const hoje = new Date(); hoje.setHours(0,0,0,0)

  const [normal, alto, critico, finalizados, hojeCount, totalAtendimentos] = await Promise.all([
    prisma.atendimento.count({ where: { status: { in: ['ABERTO','EM_ATENDIMENTO','AGUARDANDO_CLIENTE'] }, prioridade: 'NORMAL' } }),
    prisma.atendimento.count({ where: { status: { in: ['ABERTO','EM_ATENDIMENTO','AGUARDANDO_CLIENTE'] }, prioridade: 'ALTO' } }),
    prisma.atendimento.count({ where: { status: { in: ['ABERTO','EM_ATENDIMENTO','AGUARDANDO_CLIENTE'] }, prioridade: 'CRITICO' } }),
    prisma.atendimento.count({ where: { status: 'FINALIZADO' } }),
    prisma.atendimento.count({ where: { status: 'FINALIZADO', finalizadoEm: { gte: hoje } } }),
    prisma.atendimento.count(),
  ])

  // Tempo médio até a 1ª resposta do agente (em minutos).
  // "aberturaEm" é reaproveitado como reset do timer de SLA a cada nova
  // mensagem (ver whatsapp.js), então não serve de referência de início —
  // usamos a primeira mensagem real do atendimento (tabela Mensagem).
  const primeirasRespostas = await prisma.$queryRaw`
    SELECT MIN(m."timestamp") as primeira_msg,
           MIN(m."timestamp") FILTER (WHERE m."ehAgente" = true) as primeira_resposta
    FROM "Mensagem" m
    GROUP BY m."atendId"
    HAVING MIN(m."timestamp") FILTER (WHERE m."ehAgente" = true) IS NOT NULL
    ORDER BY MIN(m."timestamp") DESC
    LIMIT 100
  `
  const tempoMedioResposta = primeirasRespostas.length
    ? Math.round(primeirasRespostas.reduce((acc, r) =>
        acc + (new Date(r.primeira_resposta) - new Date(r.primeira_msg)) / 60000, 0) / primeirasRespostas.length)
    : 0

  // Ranking de agentes
  const ranking = await prisma.user.findMany({
    where: { ativo: true, role: { in: ['AGENTE','SUPERVISOR','ADMIN'] } },
    select: { id: true, nome: true, numero: true, online: true, pontos: true, avatar: true, molduraEquipada: true, tituloEquipado: true,
      _count: { select: { atendimentos: true } } },
    orderBy: { atendimentos: { _count: 'desc' } }
  })

  // Atendimentos por dia (todo o histórico, fixo — não depende do dia atual)
  const por_dia = await prisma.$queryRaw`
    SELECT DATE_TRUNC('day', "aberturaEm") as dia, COUNT(*) as total
    FROM "Atendimento"
    GROUP BY dia ORDER BY dia ASC
  `

  const niveis = await obterNiveisConfigurados()

  res.json({
    abertos: normal + alto + critico,
    normal, alto, critico,
    finalizados, hojeCount, totalAtendimentos,
    tempoMedioResposta,
    ranking: ranking.map(u => ({ ...u, total: u._count.atendimentos, nivel: nivelDe(u.pontos, niveis).nome })),
    por_dia: por_dia.map(h => ({ ...h, total: Number(h.total) }))
  })
})

// Volume de atendimentos (recebidos x resolvidos) por período, para o gráfico
// de linha/área do dashboard. Granularidade se ajusta ao tamanho do período.
router.get('/volume', requireAuth, async (req, res) => {
  const { periodo = '7d', de, ate } = req.query
  const agora = new Date()
  let inicio, fim = agora, granularidade

  if (periodo === 'hoje') {
    inicio = new Date(agora); inicio.setHours(0,0,0,0)
    granularidade = 'hora'
  } else if (periodo === '7d') {
    inicio = new Date(agora); inicio.setDate(inicio.getDate() - 6); inicio.setHours(0,0,0,0)
    granularidade = 'dia'
  } else if (periodo === '30d') {
    inicio = new Date(agora); inicio.setDate(inicio.getDate() - 29); inicio.setHours(0,0,0,0)
    granularidade = 'dia'
  } else if (periodo === '3m') {
    inicio = new Date(agora); inicio.setMonth(inicio.getMonth() - 3); inicio.setHours(0,0,0,0)
    granularidade = 'semana'
  } else if (periodo === 'personalizado' && de && ate) {
    inicio = new Date(de); inicio.setHours(0,0,0,0)
    fim = new Date(ate); fim.setHours(23,59,59,999)
    const dias = (fim - inicio) / 86400000
    granularidade = dias <= 2 ? 'hora' : dias <= 62 ? 'dia' : 'semana'
  } else {
    return res.status(400).json({ error: 'Período inválido' })
  }

  const trunc = granularidade === 'hora' ? 'hour' : granularidade === 'semana' ? 'week' : 'day'

  const [recebidos, resolvidos] = await Promise.all([
    prisma.$queryRaw`
      SELECT DATE_TRUNC(${trunc}, "aberturaEm") as bucket, COUNT(*) as total
      FROM "Atendimento"
      WHERE "aberturaEm" >= ${inicio} AND "aberturaEm" <= ${fim}
      GROUP BY bucket ORDER BY bucket ASC
    `,
    prisma.$queryRaw`
      SELECT DATE_TRUNC(${trunc}, "finalizadoEm") as bucket, COUNT(*) as total
      FROM "Atendimento"
      WHERE "finalizadoEm" >= ${inicio} AND "finalizadoEm" <= ${fim}
      GROUP BY bucket ORDER BY bucket ASC
    `,
  ])

  const mapa = {}
  const chave = d => new Date(d).toISOString()
  recebidos.forEach(r => { mapa[chave(r.bucket)] = { bucket: r.bucket, recebidos: Number(r.total), resolvidos: 0 } })
  resolvidos.forEach(r => {
    const k = chave(r.bucket)
    if (!mapa[k]) mapa[k] = { bucket: r.bucket, recebidos: 0, resolvidos: 0 }
    mapa[k].resolvidos = Number(r.total)
  })

  const pontos = Object.values(mapa).sort((a, b) => new Date(a.bucket) - new Date(b.bucket))
  res.json({ granularidade, pontos })
})

export default router
