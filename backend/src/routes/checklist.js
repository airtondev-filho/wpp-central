import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { io } from '../index.js'
import { registrarAtividade } from '../services/atividade.js'

const router = Router()
const prisma = new PrismaClient()

async function requireMembroDoItem(req, res, next) {
  const item = await prisma.tarefaChecklistItem.findUnique({ where: { id: Number(req.params.id) } })
  if (!item) return res.status(404).json({ error: 'Item não encontrado' })

  const tarefa = await prisma.tarefa.findUnique({ where: { id: item.tarefaId }, select: { lista: { select: { quadroId: true } } } })
  const quadroId = tarefa?.lista?.quadroId
  const membro = await prisma.quadroMembro.findUnique({ where: { quadroId_userId: { quadroId, userId: req.user.id } } })
  if (!membro && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Você não é membro deste quadro' })

  req.item = item
  req.quadroId = quadroId
  next()
}

// PUT /api/checklist/:id — renomear ou marcar/desmarcar concluído
router.put('/:id', requireAuth, requireMembroDoItem, async (req, res) => {
  const { titulo, concluido } = req.body
  const item = await prisma.tarefaChecklistItem.update({
    where: { id: req.item.id },
    data: {
      ...(titulo !== undefined && { titulo: titulo.trim() }),
      ...(concluido !== undefined && { concluido }),
    },
  })

  if (concluido !== undefined && concluido !== req.item.concluido) {
    await registrarAtividade({
      tarefaId: req.item.tarefaId, autorId: req.user.id,
      tipo: 'CHECKLIST_ALTERADO',
      descricao: `${req.user.nome} ${concluido ? 'marcou' : 'desmarcou'} "${item.titulo}" no checklist`,
    })
  }

  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json(item)
})

// DELETE /api/checklist/:id
router.delete('/:id', requireAuth, requireMembroDoItem, async (req, res) => {
  await prisma.tarefaChecklistItem.delete({ where: { id: req.item.id } })
  await registrarAtividade({
    tarefaId: req.item.tarefaId, autorId: req.user.id,
    tipo: 'CHECKLIST_ALTERADO',
    descricao: `${req.user.nome} removeu "${req.item.titulo}" do checklist`,
  })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json({ ok: true })
})

export default router
