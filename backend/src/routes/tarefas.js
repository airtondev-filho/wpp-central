import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth.js'
import { upload, uploadDir } from '../middleware/upload.js'
import { registrarAtividade } from '../services/atividade.js'
import { io } from '../index.js'

const router = Router()
const prisma = new PrismaClient()

const membroSelect = { select: { id: true, nome: true, avatar: true, role: true } }

const LABEL_PRIORIDADE = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }

async function carregarQuadroIdDaTarefa(tarefaId) {
  const tarefa = await prisma.tarefa.findUnique({ where: { id: tarefaId }, select: { lista: { select: { quadroId: true } } } })
  return tarefa?.lista?.quadroId
}

async function requireMembroDaTarefa(req, res, next) {
  const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(req.params.id) } })
  if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' })

  const quadroId = await carregarQuadroIdDaTarefa(tarefa.id)
  const membro = await prisma.quadroMembro.findUnique({
    where: { quadroId_userId: { quadroId, userId: req.user.id } },
  })
  if (!membro && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Você não é membro deste quadro' })

  req.tarefa = tarefa
  req.quadroId = quadroId
  next()
}

// GET /api/tarefas — lista com filtros opcionais (hoje=1 filtra por prazo no dia atual)
router.get('/', requireAuth, async (req, res) => {
  const { hoje } = req.query
  const where = {}
  if (hoje === '1') {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const fim = new Date(inicio); fim.setDate(fim.getDate() + 1)
    where.prazo = { gte: inicio, lt: fim }
    where.concluidoEm = null
  }
  if (!['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    where.lista = { quadro: { membros: { some: { userId: req.user.id } } } }

  const tarefas = await prisma.tarefa.findMany({
    where,
    include: {
      responsavel: membroSelect,
      lista: { select: { id: true, nome: true, quadroId: true, quadro: { select: { nome: true } } } },
    },
    orderBy: [{ prazo: 'asc' }, { criadoEm: 'desc' }],
  })

  res.json(tarefas)
})

// POST /api/tarefas — criar tarefa em uma lista
router.post('/', requireAuth, async (req, res) => {
  const { listaId, titulo, descricao, prioridade, responsavelId, prazo } = req.body
  if (!listaId || !titulo?.trim()) return res.status(400).json({ error: 'listaId e título são obrigatórios' })

  const lista = await prisma.lista.findUnique({ where: { id: Number(listaId) } })
  if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })

  const membro = await prisma.quadroMembro.findUnique({
    where: { quadroId_userId: { quadroId: lista.quadroId, userId: req.user.id } },
  })
  if (!membro && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Você não é membro deste quadro' })

  const ultima = await prisma.tarefa.findFirst({ where: { listaId: lista.id }, orderBy: { posicao: 'desc' } })
  const tarefa = await prisma.tarefa.create({
    data: {
      listaId: lista.id,
      titulo: titulo.trim(),
      descricao: descricao || null,
      prioridade: prioridade || 'MEDIA',
      responsavelId: responsavelId ? Number(responsavelId) : null,
      prazo: prazo ? new Date(prazo) : null,
      criadorId: req.user.id,
      posicao: (ultima?.posicao ?? -1) + 1,
    },
    include: { responsavel: membroSelect },
  })

  await registrarAtividade({
    tarefaId: tarefa.id, autorId: req.user.id,
    tipo: 'CRIADA', descricao: `${req.user.nome} criou esta tarefa`,
  })

  io.emit('quadro_updated', { quadroId: lista.quadroId })
  res.status(201).json(tarefa)
})

// GET /api/tarefas/:id — detalhe completo
router.get('/:id', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: req.tarefa.id },
    include: {
      responsavel: membroSelect,
      criador: membroSelect,
      lista: { select: { id: true, nome: true, quadroId: true } },
      tags: true,
      checklist: { orderBy: { posicao: 'asc' } },
      comentarios: { orderBy: { criadoEm: 'asc' }, include: { autor: membroSelect } },
      anexos: { orderBy: { criadoEm: 'asc' }, include: { enviadoPor: membroSelect } },
      atividades: { orderBy: { criadoEm: 'asc' }, include: { autor: membroSelect } },
    },
  })
  res.json(tarefa)
})

// PUT /api/tarefas/:id — editar título/descrição/responsável/prioridade/prazo
router.put('/:id', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const { titulo, descricao, prioridade, responsavelId, prazo } = req.body
  const antes = req.tarefa

  const tarefa = await prisma.tarefa.update({
    where: { id: antes.id },
    data: {
      ...(titulo !== undefined && { titulo: titulo.trim() }),
      ...(descricao !== undefined && { descricao: descricao || null }),
      ...(prioridade !== undefined && { prioridade }),
      ...(responsavelId !== undefined && { responsavelId: responsavelId ? Number(responsavelId) : null }),
      ...(prazo !== undefined && { prazo: prazo ? new Date(prazo) : null }),
    },
    include: { responsavel: membroSelect },
  })

  const logs = []
  if (titulo !== undefined && titulo.trim() !== antes.titulo)
    logs.push(`${req.user.nome} renomeou a tarefa para "${titulo.trim()}"`)
  if (prioridade !== undefined && prioridade !== antes.prioridade)
    logs.push(`${req.user.nome} alterou a prioridade para ${LABEL_PRIORIDADE[prioridade] || prioridade}`)
  if (responsavelId !== undefined && Number(responsavelId || 0) !== (antes.responsavelId || 0))
    logs.push(responsavelId
      ? `${req.user.nome} atribuiu a tarefa para ${tarefa.responsavel?.nome}`
      : `${req.user.nome} removeu o responsável da tarefa`)
  if (prazo !== undefined && String(prazo || '') !== String(antes.prazo ? antes.prazo.toISOString().slice(0, 10) : ''))
    logs.push(prazo ? `${req.user.nome} definiu o prazo para ${prazo}` : `${req.user.nome} removeu o prazo`)

  for (const descricaoLog of logs) {
    await registrarAtividade({ tarefaId: antes.id, autorId: req.user.id, tipo: 'EDITADA', descricao: descricaoLog })
  }

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json(tarefa)
})

// PATCH /api/tarefas/:id/mover — mover para outra lista e/ou posição (drag and drop)
router.patch('/:id/mover', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const { listaId, posicao } = req.body
  const destino = await prisma.lista.findUnique({ where: { id: Number(listaId) } })
  if (!destino || destino.quadroId !== req.quadroId)
    return res.status(400).json({ error: 'Lista inválida para este quadro' })

  const origemId = req.tarefa.listaId
  const destinoId = destino.id

  await prisma.$transaction(async (tx) => {
    // demais tarefas do destino (sem a que está sendo movida), na ordem atual
    const irmas = await tx.tarefa.findMany({
      where: { listaId: destinoId, NOT: { id: req.tarefa.id } },
      orderBy: { posicao: 'asc' },
      select: { id: true },
    })
    const indice = posicao == null ? irmas.length : Math.max(0, Math.min(Number(posicao), irmas.length))
    irmas.splice(indice, 0, { id: req.tarefa.id })

    await Promise.all(irmas.map((t, i) =>
      tx.tarefa.update({ where: { id: t.id }, data: { listaId: destinoId, posicao: i } })
    ))

    // renumerar a lista de origem, se mudou de lista
    if (origemId !== destinoId) {
      const restantes = await tx.tarefa.findMany({ where: { listaId: origemId }, orderBy: { posicao: 'asc' }, select: { id: true } })
      await Promise.all(restantes.map((t, i) => tx.tarefa.update({ where: { id: t.id }, data: { posicao: i } })))
    }
  })

  if (origemId !== destinoId) {
    await registrarAtividade({
      tarefaId: req.tarefa.id, autorId: req.user.id,
      tipo: 'LISTA_ALTERADA', descricao: `${req.user.nome} moveu a tarefa para "${destino.nome}"`,
    })
  }

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json({ ok: true })
})

// PATCH /api/tarefas/:id/concluir — toggle concluído
router.patch('/:id/concluir', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const concluir = !req.tarefa.concluidoEm
  const tarefa = await prisma.tarefa.update({
    where: { id: req.tarefa.id },
    data: { concluidoEm: concluir ? new Date() : null },
  })

  await registrarAtividade({
    tarefaId: req.tarefa.id, autorId: req.user.id,
    tipo: concluir ? 'CONCLUIDA' : 'REABERTA',
    descricao: `${req.user.nome} ${concluir ? 'concluiu' : 'reabriu'} a tarefa`,
  })

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json(tarefa)
})

// DELETE /api/tarefas/:id
router.delete('/:id', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const anexos = await prisma.tarefaAnexo.findMany({ where: { tarefaId: req.tarefa.id } })
  await prisma.tarefa.delete({ where: { id: req.tarefa.id } }) // cascata remove checklist/comentários/anexos/atividades
  for (const a of anexos) fs.unlink(path.join(uploadDir, path.basename(a.url)), () => {})

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json({ ok: true })
})

// ── Tags ──────────────────────────────────────────────────────────────────────

// POST /api/tarefas/:id/tags — associar tag existente
router.post('/:id/tags', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const { tagId } = req.body
  await prisma.tarefa.update({
    where: { id: req.tarefa.id },
    data: { tags: { connect: { id: Number(tagId) } } },
  })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.status(201).json({ ok: true })
})

// DELETE /api/tarefas/:id/tags/:tagId — remover tag da tarefa
router.delete('/:id/tags/:tagId', requireAuth, requireMembroDaTarefa, async (req, res) => {
  await prisma.tarefa.update({
    where: { id: req.tarefa.id },
    data: { tags: { disconnect: { id: Number(req.params.tagId) } } },
  })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json({ ok: true })
})

// ── Checklist ─────────────────────────────────────────────────────────────────

// POST /api/tarefas/:id/checklist — criar item
router.post('/:id/checklist', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const { titulo } = req.body
  if (!titulo?.trim()) return res.status(400).json({ error: 'Título é obrigatório' })

  const ultimo = await prisma.tarefaChecklistItem.findFirst({ where: { tarefaId: req.tarefa.id }, orderBy: { posicao: 'desc' } })
  const item = await prisma.tarefaChecklistItem.create({
    data: { tarefaId: req.tarefa.id, titulo: titulo.trim(), posicao: (ultimo?.posicao ?? -1) + 1 },
  })

  await registrarAtividade({
    tarefaId: req.tarefa.id, autorId: req.user.id,
    tipo: 'CHECKLIST_ALTERADO', descricao: `${req.user.nome} adicionou "${item.titulo}" ao checklist`,
  })

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.status(201).json(item)
})

// ── Comentários ───────────────────────────────────────────────────────────────

// POST /api/tarefas/:id/comentarios — adicionar comentário
router.post('/:id/comentarios', requireAuth, requireMembroDaTarefa, async (req, res) => {
  const { texto } = req.body
  if (!texto?.trim()) return res.status(400).json({ error: 'Texto é obrigatório' })

  const comentario = await prisma.tarefaComentario.create({
    data: { tarefaId: req.tarefa.id, autorId: req.user.id, texto: texto.trim() },
    include: { autor: membroSelect },
  })

  await registrarAtividade({
    tarefaId: req.tarefa.id, autorId: req.user.id,
    tipo: 'COMENTARIO_ADICIONADO', descricao: `${req.user.nome} adicionou um comentário`,
  })

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.status(201).json(comentario)
})

// ── Anexos ────────────────────────────────────────────────────────────────────

// POST /api/tarefas/:id/anexos — enviar arquivo (multipart, campo "arquivo")
router.post('/:id/anexos', requireAuth, requireMembroDaTarefa, upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

  const anexo = await prisma.tarefaAnexo.create({
    data: {
      tarefaId: req.tarefa.id,
      nome: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      tamanho: req.file.size,
      enviadoPorId: req.user.id,
    },
    include: { enviadoPor: membroSelect },
  })

  await registrarAtividade({
    tarefaId: req.tarefa.id, autorId: req.user.id,
    tipo: 'ANEXO_ADICIONADO', descricao: `${req.user.nome} anexou "${anexo.nome}"`,
  })

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.status(201).json(anexo)
})

export default router
