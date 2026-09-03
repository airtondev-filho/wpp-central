import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth.js'
import { uploadDir } from '../middleware/upload.js'
import { io } from '../index.js'

const router = Router()
const prisma = new PrismaClient()

async function requireMembroDaLista(req, res, next) {
  const lista = await prisma.lista.findUnique({ where: { id: Number(req.params.id) } })
  if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })

  const membro = await prisma.quadroMembro.findUnique({
    where: { quadroId_userId: { quadroId: lista.quadroId, userId: req.user.id } },
  })
  if (!membro && !['ADMIN', 'SUPERVISOR'].includes(req.user.role))
    return res.status(403).json({ error: 'Você não é membro deste quadro' })

  req.lista = lista
  next()
}

// PUT /api/listas/:id — renomear
router.put('/:id', requireAuth, requireMembroDaLista, async (req, res) => {
  const { nome } = req.body
  const lista = await prisma.lista.update({ where: { id: req.lista.id }, data: { nome: nome?.trim() } })
  io.emit('quadro_updated', { quadroId: req.lista.quadroId })
  res.json(lista)
})

// DELETE /api/listas/:id
router.delete('/:id', requireAuth, requireMembroDaLista, async (req, res) => {
  const anexos = await prisma.tarefaAnexo.findMany({ where: { tarefa: { listaId: req.lista.id } } })
  await prisma.tarefa.deleteMany({ where: { listaId: req.lista.id } }) // cascata remove checklist/comentários/anexos/atividades
  await prisma.lista.delete({ where: { id: req.lista.id } })
  for (const a of anexos) fs.unlink(path.join(uploadDir, path.basename(a.url)), () => {})

  io.emit('quadro_updated', { quadroId: req.lista.quadroId })
  res.json({ ok: true })
})

export default router
