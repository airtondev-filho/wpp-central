import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAuth, async (req, res) => {
  const notifs = await prisma.notificacao.findMany({
    where: { userId: req.user.id, lida: false },
    orderBy: { criadoEm: 'desc' }, take: 20
  })
  res.json(notifs)
})

router.patch('/ler-todas', requireAuth, async (req, res) => {
  await prisma.notificacao.updateMany({ where: { userId: req.user.id }, data: { lida: true } })
  res.json({ ok: true })
})

export default router
