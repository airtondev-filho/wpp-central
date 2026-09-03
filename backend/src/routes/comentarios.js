import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { io } from '../index.js'
import { registrarAtividade } from '../services/atividade.js'

const router = Router()
const prisma = new PrismaClient()

const autorSelect = { select: { id: true, nome: true, avatar: true } }

async function requireComentario(req, res, next) {
  const comentario = await prisma.tarefaComentario.findUnique({ where: { id: Number(req.params.id) } })
  if (!comentario) return res.status(404).json({ error: 'Comentário não encontrado' })

  const tarefa = await prisma.tarefa.findUnique({ where: { id: comentario.tarefaId }, select: { lista: { select: { quadroId: true } } } })
  const quadroId = tarefa?.lista?.quadroId

  if (comentario.autorId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Você só pode editar ou excluir seus próprios comentários' })

  req.comentario = comentario
  req.quadroId = quadroId
  next()
}

// PUT /api/comentarios/:id — editar (só o autor)
router.put('/:id', requireAuth, requireComentario, async (req, res) => {
  const { texto } = req.body
  if (!texto?.trim()) return res.status(400).json({ error: 'Texto é obrigatório' })

  const comentario = await prisma.tarefaComentario.update({
    where: { id: req.comentario.id },
    data: { texto: texto.trim(), editadoEm: new Date() },
    include: { autor: autorSelect },
  })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json(comentario)
})

// DELETE /api/comentarios/:id — excluir (autor ou ADMIN/SUPERVISOR)
router.delete('/:id', requireAuth, requireComentario, async (req, res) => {
  await prisma.tarefaComentario.delete({ where: { id: req.comentario.id } })
  io.emit('quadro_updated', { quadroId: req.quadroId })
  res.json({ ok: true })
})

export default router
