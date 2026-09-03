import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { upload, uploadDir } from '../middleware/upload.js'

const router = Router()
const prisma = new PrismaClient()

const ORDENACOES = {
  nome: { nome: 'asc' },
  atendimentos_desc: { atendimentos: { _count: 'desc' } },
  atendimentos_asc: { atendimentos: { _count: 'asc' } },
  requisicoes_desc: { requisicoes: { _count: 'desc' } },
  requisicoes_asc: { requisicoes: { _count: 'asc' } },
  treinamentos_desc: { treinamentos: { _count: 'desc' } },
  treinamentos_asc: { treinamentos: { _count: 'asc' } },
}

router.get('/', requireAuth, async (req, res) => {
  const grupos = await prisma.grupo.findMany({
    where: { arquivado: req.query.arquivado === 'true' },
    include: { _count: { select: { atendimentos: true, requisicoes: true, treinamentos: true } } },
    orderBy: ORDENACOES[req.query.ordenar] || ORDENACOES.nome,
  })
  res.json(grupos)
})

// GET /api/grupos/:jid/stats — contagem de atendimentos, requisições e treinamentos do grupo
router.get('/:jid/stats', requireAuth, async (req, res) => {
  const jid = decodeURIComponent(req.params.jid)

  const grupo = await prisma.grupo.findUnique({ where: { jid }, select: { jid: true, nome: true } })
  if (!grupo) return res.status(404).json({ error: 'Grupo não encontrado' })

  const [totalAtendimentos, atendimentosAbertos, totalRequisicoes, requisicoesAbertas, totalTreinamentos] = await Promise.all([
    prisma.atendimento.count({ where: { grupoJid: jid } }),
    prisma.atendimento.count({ where: { grupoJid: jid, status: { not: 'FINALIZADO' } } }),
    prisma.requisicao.count({ where: { grupoJid: jid } }),
    prisma.requisicao.count({ where: { grupoJid: jid, status: { not: 'CONCLUIDA' } } }),
    prisma.treinamento.count({ where: { grupoJid: jid } }),
  ])

  res.json({
    grupo,
    atendimentos: { total: totalAtendimentos, abertos: atendimentosAbertos },
    requisicoes: { total: totalRequisicoes, abertas: requisicoesAbertas },
    treinamentos: { total: totalTreinamentos },
  })
})

router.patch('/:jid', requireRole('ADMIN','SUPERVISOR'), async (req, res) => {
  const jid = decodeURIComponent(req.params.jid)
  const { slaNormal, slaAlto, arquivado } = req.body
  const grupo = await prisma.grupo.update({ where: { jid }, data: { slaNormal, slaAlto, arquivado } })
  res.json(grupo)
})

// POST /api/grupos/:jid/logo — envia/substitui a logo do cliente/grupo
router.post('/:jid/logo', requireRole('ADMIN','SUPERVISOR'), upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' })

  if (!req.file.mimetype.startsWith('image/')) {
    fs.unlink(path.join(uploadDir, req.file.filename), () => {})
    return res.status(400).json({ error: 'Envie um arquivo de imagem' })
  }

  const jid = decodeURIComponent(req.params.jid)
  const anterior = await prisma.grupo.findUnique({ where: { jid }, select: { logo: true } })

  const grupo = await prisma.grupo.update({
    where: { jid },
    data: { logo: `/uploads/${req.file.filename}` },
  })

  if (anterior?.logo) fs.unlink(path.join(uploadDir, path.basename(anterior.logo)), () => {})

  res.json(grupo)
})

export default router
