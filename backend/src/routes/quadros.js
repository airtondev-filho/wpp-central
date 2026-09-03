import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { io } from '../index.js'

const router = Router()
const prisma = new PrismaClient()

const membroSelect = { select: { id: true, nome: true, avatar: true, role: true } }

async function carregarMembro(quadroId, userId) {
  return prisma.quadroMembro.findUnique({ where: { quadroId_userId: { quadroId, userId } } })
}

async function requireMembroQuadro(req, res, next) {
  const quadroId = Number(req.params.id)
  const membro = await carregarMembro(quadroId, req.user.id)
  if (!membro && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Você não é membro deste quadro' })
  req.quadroId = quadroId
  next()
}

async function requireDonoQuadro(req, res, next) {
  const quadro = await prisma.quadro.findUnique({ where: { id: Number(req.params.id) } })
  if (!quadro) return res.status(404).json({ error: 'Quadro não encontrado' })
  if (quadro.criadorId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Apenas o criador ou um supervisor pode gerenciar este quadro' })
  req.quadro = quadro
  next()
}

// GET /api/quadros — meus quadros (com filtros)
router.get('/', requireAuth, async (req, res) => {
  const { favoritos, arquivados } = req.query

  const where = {
    membros: { some: { userId: req.user.id } },
    arquivado: arquivados === '1',
  }
  if (favoritos === '1') where.favorito = true

  const quadros = await prisma.quadro.findMany({
    where,
    include: {
      criador: membroSelect,
      _count: { select: { membros: true, listas: true } },
    },
    orderBy: { criadoEm: 'desc' },
  })

  const comTotalTarefas = await Promise.all(quadros.map(async q => ({
    ...q,
    totalTarefas: await prisma.tarefa.count({ where: { lista: { quadroId: q.id } } }),
  })))

  res.json(comTotalTarefas)
})

// POST /api/quadros — cria quadro (criador vira membro automaticamente)
router.post('/', requireAuth, async (req, res) => {
  const { nome, descricao, cor } = req.body
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })

  const quadro = await prisma.quadro.create({
    data: {
      nome: nome.trim(),
      descricao: descricao || null,
      cor: cor || '#25d366',
      criadorId: req.user.id,
      membros: { create: { userId: req.user.id } },
    },
  })
  res.status(201).json(quadro)
})

// GET /api/quadros/:id — detalhe + listas + tarefas resumidas
router.get('/:id', requireAuth, requireMembroQuadro, async (req, res) => {
  const quadro = await prisma.quadro.findUnique({
    where: { id: req.quadroId },
    include: {
      criador: membroSelect,
      membros: { include: { user: membroSelect } },
      listas: {
        orderBy: { posicao: 'asc' },
        include: {
          tarefas: {
            orderBy: { posicao: 'asc' },
            select: {
              id: true, titulo: true, prioridade: true, prazo: true, concluidoEm: true, posicao: true,
              criadorId: true,
              responsavel: membroSelect,
              tags: true,
              checklist: { select: { concluido: true } },
              _count: { select: { comentarios: true, anexos: true } },
            },
          },
        },
      },
    },
  })
  if (!quadro) return res.status(404).json({ error: 'Quadro não encontrado' })
  res.json(quadro)
})

// PUT /api/quadros/:id — editar nome/descrição/cor
router.put('/:id', requireAuth, requireMembroQuadro, requireDonoQuadro, async (req, res) => {
  const { nome, descricao, cor } = req.body
  const quadro = await prisma.quadro.update({
    where: { id: req.quadroId },
    data: { nome: nome?.trim(), descricao, cor },
  })
  res.json(quadro)
})

// PATCH /api/quadros/:id/arquivar — toggle arquivado
router.patch('/:id/arquivar', requireAuth, requireMembroQuadro, requireDonoQuadro, async (req, res) => {
  const quadro = await prisma.quadro.update({
    where: { id: req.quadroId },
    data: { arquivado: !req.quadro.arquivado },
  })
  res.json(quadro)
})

// PATCH /api/quadros/:id/favorito — toggle favorito
router.patch('/:id/favorito', requireAuth, requireMembroQuadro, async (req, res) => {
  const quadro = await prisma.quadro.findUnique({ where: { id: req.quadroId } })
  const atualizado = await prisma.quadro.update({
    where: { id: req.quadroId },
    data: { favorito: !quadro.favorito },
  })
  res.json(atualizado)
})

// POST /api/quadros/:id/membros — adicionar membro
router.post('/:id/membros', requireAuth, requireMembroQuadro, requireDonoQuadro, async (req, res) => {
  const { userId } = req.body
  const membro = await prisma.quadroMembro.upsert({
    where: { quadroId_userId: { quadroId: req.quadroId, userId: Number(userId) } },
    update: {},
    create: { quadroId: req.quadroId, userId: Number(userId) },
  })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.status(201).json(membro)
})

// DELETE /api/quadros/:id/membros/:userId — remover membro
router.delete('/:id/membros/:userId', requireAuth, requireMembroQuadro, requireDonoQuadro, async (req, res) => {
  await prisma.quadroMembro.deleteMany({
    where: { quadroId: req.quadroId, userId: Number(req.params.userId) },
  })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json({ ok: true })
})

// POST /api/quadros/:id/listas — criar lista no quadro
router.post('/:id/listas', requireAuth, requireMembroQuadro, async (req, res) => {
  const { nome } = req.body
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })

  const ultima = await prisma.lista.findFirst({ where: { quadroId: req.quadroId }, orderBy: { posicao: 'desc' } })
  const lista = await prisma.lista.create({
    data: { quadroId: req.quadroId, nome: nome.trim(), posicao: (ultima?.posicao ?? -1) + 1 },
  })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.status(201).json(lista)
})

// PATCH /api/quadros/:id/listas/reordenar — reordenar as listas do quadro (drag and drop)
router.patch('/:id/listas/reordenar', requireAuth, requireMembroQuadro, async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids deve ser um array' })

  const listas = await prisma.lista.findMany({ where: { quadroId: req.quadroId } })
  const validos = new Set(listas.map(l => l.id))
  if (ids.length !== listas.length || !ids.every(id => validos.has(Number(id))))
    return res.status(400).json({ error: 'Lista de ids inválida' })

  await Promise.all(ids.map((id, i) => prisma.lista.update({ where: { id: Number(id) }, data: { posicao: i } })))
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json({ ok: true })
})

export default router
