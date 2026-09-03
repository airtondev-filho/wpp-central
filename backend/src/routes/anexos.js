import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth.js'
import { uploadDir } from '../middleware/upload.js'
import { io } from '../index.js'

const router = Router()
const prisma = new PrismaClient()

// DELETE /api/anexos/:id — remove o arquivo e o registro (quem enviou ou ADMIN/SUPERVISOR)
router.delete('/:id', requireAuth, async (req, res) => {
  const anexo = await prisma.tarefaAnexo.findUnique({ where: { id: Number(req.params.id) } })
  if (!anexo) return res.status(404).json({ error: 'Anexo não encontrado' })

  const tarefa = await prisma.tarefa.findUnique({ where: { id: anexo.tarefaId }, select: { lista: { select: { quadroId: true } } } })

  if (anexo.enviadoPorId !== req.user.id && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Apenas quem enviou o anexo ou um supervisor pode removê-lo' })

  await prisma.tarefaAnexo.delete({ where: { id: anexo.id } })
  fs.unlink(path.join(uploadDir, path.basename(anexo.url)), () => {})

  io.emit('quadro_updated', { quadroId: tarefa?.lista?.quadroId })
  res.json({ ok: true })
})

export default router
