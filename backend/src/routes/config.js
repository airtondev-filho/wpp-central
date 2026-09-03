import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireRole } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireRole('ADMIN','SUPERVISOR'), async (req, res) => {
  const configs = await prisma.config.findMany()
  const obj = {}
  configs.forEach(c => { obj[c.chave] = c.valor })
  res.json(obj)
})

router.put('/', requireRole('ADMIN'), async (req, res) => {
  const entries = Object.entries(req.body)
  for (const [chave, valor] of entries) {
    await prisma.config.upsert({ where: { chave }, update: { valor: String(valor) }, create: { chave, valor: String(valor) } })
  }
  res.json({ ok: true })
})

export default router
