import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireRole } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Intenções
router.get('/intencoes', requireRole('ADMIN','SUPERVISOR'), async (req, res) => {
  res.json(await prisma.intencao.findMany({ include: { _count: { select: { regras: true } } } }))
})
router.post('/intencoes', requireRole('ADMIN'), async (req, res) => {
  const { nome, descricao, frases } = req.body
  res.json(await prisma.intencao.create({ data: { nome, descricao, frases } }))
})
router.put('/intencoes/:id', requireRole('ADMIN'), async (req, res) => {
  const { nome, descricao, frases, ativa } = req.body
  res.json(await prisma.intencao.update({ where: { id: Number(req.params.id) }, data: { nome, descricao, frases, ativa } }))
})
router.delete('/intencoes/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.intencao.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

// Regras
router.get('/regras', requireRole('ADMIN','SUPERVISOR'), async (req, res) => {
  res.json(await prisma.regraAutomacao.findMany({ include: { intencao: true }, orderBy: { ordem: 'asc' } }))
})
router.post('/regras', requireRole('ADMIN'), async (req, res) => {
  const { nome, gatilho, intencaoId, confiancaMin, acao, acaoValor } = req.body
  res.json(await prisma.regraAutomacao.create({ data: { nome, gatilho, intencaoId, confiancaMin, acao, acaoValor } }))
})
router.put('/regras/:id', requireRole('ADMIN'), async (req, res) => {
  const { nome, ativa, gatilho, intencaoId, confiancaMin, acao, acaoValor } = req.body
  res.json(await prisma.regraAutomacao.update({ where: { id: Number(req.params.id) }, data: { nome, ativa, gatilho, intencaoId, confiancaMin, acao, acaoValor } }))
})
router.delete('/regras/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.regraAutomacao.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
