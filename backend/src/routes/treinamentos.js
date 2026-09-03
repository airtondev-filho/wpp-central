import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { io } from '../index.js'
import { registrarReuniaoConcluida } from '../gamificacao/servico.js'
import { criarEvento, atualizarEvento, excluirEvento } from '../services/googleCalendar.js'

const router = Router()
const prisma = new PrismaClient()

const membroSelect = { select: { id: true, nome: true, avatar: true, role: true } }
const grupoSelect = { select: { jid: true, nome: true } }

function podeGerenciar(req, treinamento) {
  return treinamento.instrutorId === req.user.id || ['ADMIN', 'SUPERVISOR'].includes(req.user.role)
}

async function requireTreinamento(req, res, next) {
  const treinamento = await prisma.treinamento.findUnique({ where: { id: Number(req.params.id) } })
  if (!treinamento) return res.status(404).json({ error: 'Treinamento não encontrado' })
  req.treinamento = treinamento
  next()
}

function requireGerenciar(req, res, next) {
  if (!podeGerenciar(req, req.treinamento))
    return res.status(403).json({ error: 'Apenas o instrutor ou um supervisor pode gerenciar este treinamento' })
  next()
}

// GET /api/treinamentos — lista com filtros opcionais por status e por "hoje"
router.get('/', requireAuth, async (req, res) => {
  const { status, hoje, grupoJid } = req.query
  const where = {}
  if (status) where.status = { in: status.split(',') }
  if (grupoJid) where.grupoJid = grupoJid
  if (hoje === '1') {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const fim = new Date(inicio); fim.setDate(fim.getDate() + 1)
    where.data = { gte: inicio, lt: fim }
  }

  const treinamentos = await prisma.treinamento.findMany({
    where,
    include: {
      instrutor: membroSelect,
      grupo: grupoSelect,
      participantes: { select: { status: true } },
    },
    orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
  })

  res.json(treinamentos.map(t => ({
    ...t,
    totalParticipantes: t.participantes.length,
    concluidos: t.participantes.filter(p => p.status === 'CONCLUIDO').length,
  })))
})

// POST /api/treinamentos — criar treinamento
router.post('/', requireAuth, async (req, res) => {
  const { nome, descricao, instrutorId, grupoJid, data, duracaoMin, conteudo, observacoes, materiais } = req.body
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })

  const treinamento = await prisma.treinamento.create({
    data: {
      nome: nome.trim(),
      descricao: descricao || null,
      instrutorId: instrutorId ? Number(instrutorId) : req.user.id,
      grupoJid: grupoJid || null,
      data: data ? new Date(data) : null,
      duracaoMin: duracaoMin ? Number(duracaoMin) : null,
      conteudo: conteudo || null,
      observacoes: observacoes || null,
      materiais: Array.isArray(materiais) ? materiais : [],
    },
    include: { instrutor: membroSelect, grupo: grupoSelect },
  })

  try {
    const evento = await criarEvento(treinamento)
    if (evento) {
      treinamento.googleEventId = evento.eventId
      treinamento.googleMeetLink = evento.meetLink
      await prisma.treinamento.update({
        where: { id: treinamento.id },
        data: { googleEventId: evento.eventId, googleMeetLink: evento.meetLink },
      })
    }
  } catch (err) {
    console.error('Erro ao criar evento na Google Agenda:', err)
  }

  res.status(201).json(treinamento)
})

// GET /api/treinamentos/:id — detalhe + participantes
router.get('/:id', requireAuth, requireTreinamento, async (req, res) => {
  const treinamento = await prisma.treinamento.findUnique({
    where: { id: req.treinamento.id },
    include: {
      instrutor: membroSelect,
      grupo: grupoSelect,
      participantes: { include: { user: membroSelect } },
    },
  })
  res.json(treinamento)
})

// PUT /api/treinamentos/:id — editar
router.put('/:id', requireAuth, requireTreinamento, requireGerenciar, async (req, res) => {
  const { nome, descricao, instrutorId, grupoJid, data, duracaoMin, status, conteudo, observacoes, materiais } = req.body

  const treinamento = await prisma.treinamento.update({
    where: { id: req.treinamento.id },
    data: {
      ...(nome !== undefined && { nome: nome.trim() }),
      ...(descricao !== undefined && { descricao: descricao || null }),
      ...(instrutorId !== undefined && { instrutorId: Number(instrutorId) }),
      ...(grupoJid !== undefined && { grupoJid: grupoJid || null }),
      ...(data !== undefined && { data: data ? new Date(data) : null }),
      ...(duracaoMin !== undefined && { duracaoMin: duracaoMin ? Number(duracaoMin) : null }),
      ...(status !== undefined && { status }),
      ...(conteudo !== undefined && { conteudo: conteudo || null }),
      ...(observacoes !== undefined && { observacoes: observacoes || null }),
      ...(materiais !== undefined && { materiais: Array.isArray(materiais) ? materiais : [] }),
    },
    include: { instrutor: membroSelect, grupo: grupoSelect },
  })

  atualizarEvento(treinamento).catch(err => console.error('Erro ao atualizar evento na Google Agenda:', err))

  io.emit('treinamento_updated', { treinamentoId: treinamento.id })
  res.json(treinamento)
})

// DELETE /api/treinamentos/:id
router.delete('/:id', requireAuth, requireTreinamento, requireGerenciar, async (req, res) => {
  try {
    await excluirEvento(req.treinamento)
  } catch (err) {
    console.error('Erro ao excluir evento na Google Agenda:', err)
  }

  await prisma.treinamento.delete({ where: { id: req.treinamento.id } })
  io.emit('treinamento_updated', { treinamentoId: req.treinamento.id })
  res.json({ ok: true })
})

// POST /api/treinamentos/:id/participantes — adicionar participante
router.post('/:id/participantes', requireAuth, requireTreinamento, requireGerenciar, async (req, res) => {
  const { userId } = req.body
  const participante = await prisma.treinamentoParticipante.upsert({
    where: { treinamentoId_userId: { treinamentoId: req.treinamento.id, userId: Number(userId) } },
    update: {},
    create: { treinamentoId: req.treinamento.id, userId: Number(userId) },
    include: { user: membroSelect },
  })
  io.emit('treinamento_updated', { treinamentoId: req.treinamento.id })
  res.status(201).json(participante)
})

// DELETE /api/treinamentos/:id/participantes/:userId
router.delete('/:id/participantes/:userId', requireAuth, requireTreinamento, requireGerenciar, async (req, res) => {
  await prisma.treinamentoParticipante.deleteMany({
    where: { treinamentoId: req.treinamento.id, userId: Number(req.params.userId) },
  })
  io.emit('treinamento_updated', { treinamentoId: req.treinamento.id })
  res.json({ ok: true })
})

// PATCH /api/treinamentos/:id/participantes/:userId — atualizar status
// (o próprio participante pode marcar seu progresso; instrutor/ADMIN/SUPERVISOR podem marcar o de qualquer um)
router.patch('/:id/participantes/:userId', requireAuth, requireTreinamento, async (req, res) => {
  const alvoUserId = Number(req.params.userId)
  if (alvoUserId !== req.user.id && !podeGerenciar(req, req.treinamento))
    return res.status(403).json({ error: 'Você só pode atualizar seu próprio progresso' })

  const { status } = req.body
  const participante = await prisma.treinamentoParticipante.update({
    where: { treinamentoId_userId: { treinamentoId: req.treinamento.id, userId: alvoUserId } },
    data: { status, concluidoEm: status === 'CONCLUIDO' ? new Date() : null },
    include: { user: membroSelect },
  })

  if (status === 'CONCLUIDO') {
    registrarReuniaoConcluida(req.treinamento.id, alvoUserId).catch(err => console.error('Erro ao registrar gamificação:', err))
  }

  io.emit('treinamento_updated', { treinamentoId: req.treinamento.id })
  res.json(participante)
})

export default router
