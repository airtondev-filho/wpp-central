import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth.js'
import { upload, uploadDir } from '../middleware/upload.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/usuarios — lista enxuta de usuários ativos, para seleção de
// membros/responsáveis/participantes (quadros e treinamentos)
router.get('/', requireAuth, async (req, res) => {
  const usuarios = await prisma.user.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, avatar: true, role: true },
    orderBy: { nome: 'asc' },
  })
  res.json(usuarios)
})

// POST /api/usuarios/me/avatar — envia/substitui a foto de perfil do usuário logado
router.post('/me/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' })

  if (!req.file.mimetype.startsWith('image/')) {
    fs.unlink(path.join(uploadDir, req.file.filename), () => {})
    return res.status(400).json({ error: 'Envie um arquivo de imagem' })
  }

  const anterior = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatar: true } })

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatar: `/uploads/${req.file.filename}` },
    select: { id: true, nome: true, email: true, role: true, numero: true, avatar: true, molduraEquipada: true, tituloEquipado: true, bannerEquipado: true },
  })

  if (anterior?.avatar) fs.unlink(path.join(uploadDir, path.basename(anterior.avatar)), () => {})

  res.json(user)
})

export default router
