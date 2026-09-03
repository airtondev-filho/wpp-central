import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/tags — todas as tags disponíveis (para autocomplete/seleção)
router.get('/', requireAuth, async (req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { nome: 'asc' } })
  res.json(tags)
})

// POST /api/tags — criar tag
router.post('/', requireAuth, async (req, res) => {
  const { nome, cor } = req.body
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })

  const tag = await prisma.tag.upsert({
    where: { nome: nome.trim().toUpperCase() },
    update: {},
    create: { nome: nome.trim().toUpperCase(), cor: cor || '#25d366' },
  })
  res.status(201).json(tag)
})

// DELETE /api/tags/:id — remove a tag do sistema (e de todas as tarefas)
router.delete('/:id', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  await prisma.tag.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
