import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth.js'
import { upload, uploadDir } from '../middleware/upload.js'
import { io } from '../index.js'
import { registrarRequisicaoCadastrada } from '../gamificacao/servico.js'
import { criarTaskClickup, atualizarTaskClickup, excluirTaskClickup } from '../services/clickup.js'

const router = Router()
const prisma = new PrismaClient()

const usuarioSelect = { select: { id: true, nome: true, avatar: true, role: true } }
const grupoSelect = { select: { jid: true, nome: true } }

const include = {
  grupo: grupoSelect,
  criador: usuarioSelect,
  responsavel: usuarioSelect,
  tags: true,
  anexos: { orderBy: { criadoEm: 'asc' }, include: { enviadoPor: usuarioSelect } },
}

function tagsData(tagIds, op = 'set') {
  return tagIds === undefined ? {} : { tags: { [op]: tagIds.map(id => ({ id: Number(id) })) } }
}

// GET /api/requisicoes — listar
router.get('/', requireAuth, async (req, res) => {
  const requisicoes = await prisma.requisicao.findMany({
    include,
    orderBy: { criadoEm: 'desc' },
  })
  res.json(requisicoes)
})

// GET /api/requisicoes/contagem/pendentes — total de requisições ainda não concluídas
router.get('/contagem/pendentes', requireAuth, async (req, res) => {
  const total = await prisma.requisicao.count({ where: { status: { not: 'CONCLUIDA' } } })
  res.json({ total })
})

// GET /api/requisicoes/:id — detalhe
router.get('/:id', requireAuth, async (req, res) => {
  const requisicao = await prisma.requisicao.findUnique({ where: { id: Number(req.params.id) }, include })
  if (!requisicao) return res.status(404).json({ error: 'Requisição não encontrada' })
  res.json(requisicao)
})

// POST /api/requisicoes — criar
router.post('/', requireAuth, async (req, res) => {
  const { nome, descricao, grupoJid, prioridade, responsavelId, prazo, avisoIntervaloMinutos, tagIds } = req.body
  if (!nome?.trim() || !grupoJid) return res.status(400).json({ error: 'Nome e grupo são obrigatórios' })

  const grupo = await prisma.grupo.findUnique({ where: { jid: grupoJid } })
  if (!grupo) return res.status(404).json({ error: 'Grupo não encontrado' })

  const requisicao = await prisma.requisicao.create({
    data: {
      nome: nome.trim(),
      descricao: descricao || null,
      grupoJid,
      criadorId: req.user.id,
      prioridade: prioridade || 'NORMAL',
      responsavelId: responsavelId ? Number(responsavelId) : null,
      prazo: prazo ? new Date(prazo) : null,
      avisoIntervaloMinutos: avisoIntervaloMinutos ? Number(avisoIntervaloMinutos) : null,
      ...tagsData(tagIds, 'connect'),
    },
    include,
  })

  registrarRequisicaoCadastrada(requisicao).catch(err => console.error('Erro ao registrar gamificação:', err))

  try {
    const clickupTaskId = await criarTaskClickup(requisicao)
    if (clickupTaskId) {
      requisicao.clickupTaskId = clickupTaskId
      await prisma.requisicao.update({ where: { id: requisicao.id }, data: { clickupTaskId } })
    }
  } catch (err) {
    console.error('Erro ao criar task no ClickUp:', err)
  }

  io.emit('requisicao_updated', { id: requisicao.id })
  res.status(201).json(requisicao)
})

// PUT /api/requisicoes/:id — editar
router.put('/:id', requireAuth, async (req, res) => {
  const { nome, descricao, grupoJid, status, prioridade, responsavelId, prazo, avisoIntervaloMinutos, tagIds } = req.body
  const id = Number(req.params.id)

  const requisicao = await prisma.requisicao.update({
    where: { id },
    data: {
      ...(nome !== undefined && { nome: nome.trim() }),
      ...(descricao !== undefined && { descricao: descricao || null }),
      ...(grupoJid !== undefined && { grupoJid }),
      ...(status !== undefined && { status, concluidoEm: status === 'CONCLUIDA' ? new Date() : null }),
      ...(prioridade !== undefined && { prioridade }),
      ...(responsavelId !== undefined && { responsavelId: responsavelId ? Number(responsavelId) : null }),
      ...(prazo !== undefined && { prazo: prazo ? new Date(prazo) : null, ultimoAvisoEm: null }),
      ...(avisoIntervaloMinutos !== undefined && { avisoIntervaloMinutos: avisoIntervaloMinutos ? Number(avisoIntervaloMinutos) : null, ultimoAvisoEm: null }),
      ...tagsData(tagIds),
    },
    include,
  })

  atualizarTaskClickup(requisicao).catch(err => console.error('Erro ao atualizar task no ClickUp:', err))

  io.emit('requisicao_updated', { id: requisicao.id })
  res.json(requisicao)
})

// DELETE /api/requisicoes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const requisicao = await prisma.requisicao.findUnique({ where: { id } })
  if (!requisicao) return res.status(404).json({ error: 'Requisição não encontrada' })

  try {
    await excluirTaskClickup(requisicao)
  } catch (err) {
    console.error('Erro ao excluir task no ClickUp:', err)
  }

  const anexos = await prisma.requisicaoAnexo.findMany({ where: { requisicaoId: id } })
  await prisma.requisicao.delete({ where: { id } }) // cascata remove anexos
  for (const a of anexos) fs.unlink(path.join(uploadDir, path.basename(a.url)), () => {})

  io.emit('requisicao_updated', { id })
  res.json({ ok: true })
})

// ── Anexos (fotos/vídeos) ─────────────────────────────────────────────────────

// POST /api/requisicoes/:id/anexos — enviar foto/vídeo (multipart, campo "arquivo")
router.post('/:id/anexos', requireAuth, upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

  const requisicaoId = Number(req.params.id)
  const requisicao = await prisma.requisicao.findUnique({ where: { id: requisicaoId } })
  if (!requisicao) {
    fs.unlink(req.file.path, () => {})
    return res.status(404).json({ error: 'Requisição não encontrada' })
  }

  const tipo = req.file.mimetype.startsWith('video/') ? 'video'
    : req.file.mimetype.startsWith('image/') ? 'image'
    : null
  if (!tipo) {
    fs.unlink(req.file.path, () => {})
    return res.status(400).json({ error: 'Apenas fotos e vídeos são permitidos' })
  }

  const anexo = await prisma.requisicaoAnexo.create({
    data: {
      requisicaoId,
      nome: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      tipo,
      tamanho: req.file.size,
      enviadoPorId: req.user.id,
    },
    include: { enviadoPor: usuarioSelect },
  })

  io.emit('requisicao_updated', { id: requisicaoId })
  res.status(201).json(anexo)
})

// DELETE /api/requisicoes/:id/anexos/:anexoId
router.delete('/:id/anexos/:anexoId', requireAuth, async (req, res) => {
  const anexo = await prisma.requisicaoAnexo.findUnique({ where: { id: Number(req.params.anexoId) } })
  if (!anexo || anexo.requisicaoId !== Number(req.params.id)) return res.status(404).json({ error: 'Anexo não encontrado' })

  await prisma.requisicaoAnexo.delete({ where: { id: anexo.id } })
  fs.unlink(path.join(uploadDir, path.basename(anexo.url)), () => {})

  io.emit('requisicao_updated', { id: Number(req.params.id) })
  res.json({ ok: true })
})

export default router
