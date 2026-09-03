import { Router } from 'express'
import PDFDocument from 'pdfkit'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

async function getHoraReset() {
  const cfg = await prisma.config.findUnique({ where: { chave: 'raiox_hora_reset' } })
  const [h, m] = (cfg?.valor || '00:00').split(':').map(Number)
  return { h: h || 0, m: m || 0 }
}

async function coletarDados() {
  const { h, m } = await getHoraReset()
  const agora = new Date()
  const hoje = new Date(agora); hoje.setHours(h, m, 0, 0)
  if (hoje > agora) hoje.setDate(hoje.getDate() - 1)
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1)

  const baseWhere = { aberturaEm: { gte: hoje, lt: amanha } }

  const [total, aberto, emAtendimento, aguardandoCliente, finalizado] = await Promise.all([
    prisma.atendimento.count({ where: baseWhere }),
    prisma.atendimento.count({ where: { ...baseWhere, status: 'ABERTO' } }),
    prisma.atendimento.count({ where: { ...baseWhere, status: 'EM_ATENDIMENTO' } }),
    prisma.atendimento.count({ where: { ...baseWhere, status: 'AGUARDANDO_CLIENTE' } }),
    prisma.atendimento.count({ where: { ...baseWhere, status: 'FINALIZADO' } }),
  ])

  const porHora = await prisma.$queryRaw`
    SELECT DATE_TRUNC('hour', "aberturaEm") as hora, COUNT(*) as total
    FROM "Atendimento"
    WHERE "aberturaEm" >= ${hoje} AND "aberturaEm" < ${amanha}
    GROUP BY hora ORDER BY hora ASC
  `

  const porAgente = await prisma.atendimento.groupBy({
    by: ['agenteId'],
    where: { ...baseWhere, agenteId: { not: null } },
    _count: { _all: true },
  })
  const agentes = porAgente.length
    ? await prisma.user.findMany({
        where: { id: { in: porAgente.map(p => p.agenteId) } },
        select: { id: true, nome: true },
      })
    : []
  const ranking = porAgente
    .map(p => ({ id: p.agenteId, nome: agentes.find(a => a.id === p.agenteId)?.nome || '—', total: p._count._all }))
    .sort((a, b) => b.total - a.total)

  const porGrupoStatus = await prisma.atendimento.groupBy({
    by: ['grupoJid', 'status'],
    where: baseWhere,
    _count: { _all: true },
  })
  const grupoJids = [...new Set(porGrupoStatus.map(p => p.grupoJid))]
  const gruposInfo = grupoJids.length
    ? await prisma.grupo.findMany({ where: { jid: { in: grupoJids } }, select: { jid: true, nome: true } })
    : []
  const porGrupoMap = new Map()
  for (const p of porGrupoStatus) {
    if (!porGrupoMap.has(p.grupoJid)) {
      porGrupoMap.set(p.grupoJid, {
        jid: p.grupoJid,
        nome: gruposInfo.find(g => g.jid === p.grupoJid)?.nome || '—',
        aberto: 0,
        andamento: 0,
        finalizado: 0,
      })
    }
    const bucket = p.status === 'ABERTO' ? 'aberto' : p.status === 'FINALIZADO' ? 'finalizado' : 'andamento'
    porGrupoMap.get(p.grupoJid)[bucket] += p._count._all
  }
  const porGrupo = [...porGrupoMap.values()]
    .sort((a, b) => (b.aberto + b.andamento + b.finalizado) - (a.aberto + a.andamento + a.finalizado))

  const gruposAbertos = porGrupo.filter(g => g.aberto > 0).length
  const gruposAndamento = porGrupo.filter(g => g.andamento > 0).length
  const gruposFechados = porGrupo.filter(g => g.finalizado > 0).length

  return {
    hoje,
    total,
    aberto,
    andamento: emAtendimento + aguardandoCliente,
    emAtendimento,
    aguardandoCliente,
    finalizado,
    porHora: porHora.map(h => ({ hora: h.hora, total: Number(h.total) })),
    ranking,
    porGrupo,
    gruposAbertos,
    gruposAndamento,
    gruposFechados,
  }
}

router.get('/', requireAuth, async (req, res) => {
  const { hoje, ...dados } = await coletarDados()
  res.json(dados)
})

router.get('/pdf', requireAuth, async (req, res) => {
  const dados = await coletarDados()
  const dataStr = dados.hoje.toLocaleDateString('pt-BR')

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="raio-x-${dados.hoje.toISOString().slice(0, 10)}.pdf"`)
  doc.pipe(res)

  doc.fontSize(20).fillColor('#111').text('Raio X do dia', { align: 'left' })
  doc.fontSize(11).fillColor('#555').text(`Panorama dos atendimentos — ${dataStr}`)
  doc.moveDown(1.2)

  const linha = (label, valor) => {
    doc.fontSize(12).fillColor('#111').text(label, { continued: true })
    doc.fillColor('#000').text(`  ${valor}`)
  }
  doc.fontSize(14).fillColor('#111').text('Resumo do dia')
  doc.moveDown(0.4)
  linha('Atendimentos realizados hoje:', dados.total)
  linha('Finalizados:', dados.finalizado)
  linha('Em andamento:', dados.andamento)
  linha('Em aberto:', dados.aberto)
  doc.moveDown(0.6)
  linha('Grupos com atendimento fechado:', dados.gruposFechados)
  linha('Grupos com atendimento em andamento:', dados.gruposAndamento)
  linha('Grupos com atendimento em aberto:', dados.gruposAbertos)
  doc.moveDown(1)

  doc.fontSize(14).fillColor('#111').text('Volume por hora')
  doc.moveDown(0.4)
  if (dados.porHora.length) {
    dados.porHora.forEach(h => {
      const hora = new Date(h.hora).getHours()
      doc.fontSize(11).fillColor('#333').text(`${String(hora).padStart(2, '0')}h  —  ${h.total} atendimento(s)`)
    })
  } else {
    doc.fontSize(11).fillColor('#888').text('Nenhum atendimento registrado hoje.')
  }
  doc.moveDown(1)

  doc.fontSize(14).fillColor('#111').text('Agentes que mais atenderam hoje')
  doc.moveDown(0.4)
  if (dados.ranking.length) {
    dados.ranking.slice(0, 10).forEach((a, i) => {
      doc.fontSize(11).fillColor('#333').text(`${i + 1}. ${a.nome} — ${a.total} atendimento(s)`)
    })
  } else {
    doc.fontSize(11).fillColor('#888').text('Nenhum atendimento atribuído hoje.')
  }

  doc.end()
})

export default router
