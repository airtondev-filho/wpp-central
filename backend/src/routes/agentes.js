import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { requireRole } from '../middleware/auth.js'
import { upload, uploadDir } from '../middleware/upload.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireRole('ADMIN','SUPERVISOR','AGENTE'), async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, nome: true, email: true, role: true, numero: true, avatar: true, molduraEquipada: true, tituloEquipado: true, bannerEquipado: true, ativo: true, online: true, ultimoAcesso: true, criadoEm: true },
    orderBy: { nome: 'asc' }
  })
  res.json(users)
})

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { nome, email, senha, role, numero } = req.body
  const hash = await bcrypt.hash(senha || '123456', 10)
  const user = await prisma.user.create({
    data: { nome, email, senha: hash, role: role || 'AGENTE', numero: numero?.replace(/\D/g,'') || null },
    select: { id: true, nome: true, email: true, role: true, numero: true }
  })
  res.json(user)
})

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { nome, email, role, numero, ativo, senha } = req.body
  const data = { nome, email, role, ativo, numero: numero?.replace(/\D/g,'') || null }
  if (senha) data.senha = await bcrypt.hash(senha, 10)
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data,
    select: { id: true, nome: true, email: true, role: true, numero: true, ativo: true }
  })
  res.json(user)
})

// POST /api/agentes/:id/avatar — admin envia/substitui a foto de perfil de um agente
router.post('/:id/avatar', requireRole('ADMIN'), upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' })

  if (!req.file.mimetype.startsWith('image/')) {
    fs.unlink(path.join(uploadDir, req.file.filename), () => {})
    return res.status(400).json({ error: 'Envie um arquivo de imagem' })
  }

  const id = Number(req.params.id)
  const anterior = await prisma.user.findUnique({ where: { id }, select: { avatar: true } })

  const user = await prisma.user.update({
    where: { id },
    data: { avatar: `/uploads/${req.file.filename}` },
    select: { id: true, nome: true, email: true, role: true, numero: true, avatar: true },
  })

  if (anterior?.avatar) fs.unlink(path.join(uploadDir, path.basename(anterior.avatar)), () => {})

  res.json(user)
})

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { ativo: false } })
  res.json({ ok: true })
})

export default router
