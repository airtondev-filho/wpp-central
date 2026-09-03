import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

router.post('/login', async (req, res) => {
  const { email, senha } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })
  const ok = await bcrypt.compare(senha, user.senha)
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' })
  if (!user.ativo) return res.status(403).json({ error: 'Sua conta ainda está aguardando aprovação de um administrador' })
  await prisma.user.update({ where: { id: user.id }, data: { online: true, ultimoAcesso: new Date() } })
  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: '7d' }
  )
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role, numero: user.numero, avatar: user.avatar, molduraEquipada: user.molduraEquipada, tituloEquipado: user.tituloEquipado, bannerEquipado: user.bannerEquipado } })
})

router.post('/signup', async (req, res) => {
  const { nome, email, senha } = req.body
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha nome, email e senha' })
  if (senha.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })

  const existente = await prisma.user.findUnique({ where: { email } })
  if (existente) return res.status(409).json({ error: 'Este email já está cadastrado' })

  const hash = await bcrypt.hash(senha, 10)
  await prisma.user.create({
    data: { nome, email, senha: hash, role: 'AGENTE', ativo: false }
  })
  res.status(201).json({ ok: true, message: 'Cadastro enviado! Aguarde a aprovação de um administrador.' })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id },
    select: { id: true, nome: true, email: true, role: true, numero: true, avatar: true, molduraEquipada: true, tituloEquipado: true, bannerEquipado: true } })
  res.json(user)
})

router.post('/logout', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { online: false } })
  res.json({ ok: true })
})

export default router
