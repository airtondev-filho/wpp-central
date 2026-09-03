import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import { startWhatsApp, getWhatsAppStatus } from './services/whatsapp.js'
import { startSLAJob } from './jobs/sla.js'
import { startLembreteRequisicaoJob } from './jobs/lembreteRequisicao.js'
import { startRedirecionamentoJob } from './jobs/redirecionamento.js'
import { startTreinamentoStatusJob } from './jobs/treinamentoStatus.js'

import authRoutes        from './routes/auth.js'
import atendRoutes       from './routes/atendimentos.js'
import gruposRoutes      from './routes/grupos.js'
import agentesRoutes     from './routes/agentes.js'
import statsRoutes       from './routes/stats.js'
import raioxRoutes       from './routes/raiox.js'
import configRoutes      from './routes/config.js'
import automacaoRoutes   from './routes/automacao.js'
import notifRoutes       from './routes/notificacoes.js'
import quadrosRoutes     from './routes/quadros.js'
import listasRoutes      from './routes/listas.js'
import tarefasRoutes     from './routes/tarefas.js'
import tagsRoutes        from './routes/tags.js'
import checklistRoutes   from './routes/checklist.js'
import comentariosRoutes from './routes/comentarios.js'
import anexosRoutes      from './routes/anexos.js'
import treinamentosRoutes from './routes/treinamentos.js'
import usuariosRoutes    from './routes/usuarios.js'
import requisicoesRoutes from './routes/requisicoes.js'
import gamificacaoRoutes  from './routes/gamificacao.js'
import googleAuthRoutes   from './routes/googleAuth.js'
import { uploadDir }     from './middleware/upload.js'

const app = express()
const httpServer = createServer(app)

export const io = new SocketIO(httpServer, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadDir))

app.use('/api/auth',          authRoutes)
app.use('/api/atendimentos',  atendRoutes)
app.use('/api/grupos',        gruposRoutes)
app.use('/api/agentes',       agentesRoutes)
app.use('/api/stats',         statsRoutes)
app.use('/api/raiox',         raioxRoutes)
app.use('/api/config',        configRoutes)
app.use('/api/automacao',     automacaoRoutes)
app.use('/api/notificacoes',  notifRoutes)
app.use('/api/quadros',       quadrosRoutes)
app.use('/api/listas',        listasRoutes)
app.use('/api/tarefas',       tarefasRoutes)
app.use('/api/tags',          tagsRoutes)
app.use('/api/checklist',     checklistRoutes)
app.use('/api/comentarios',   comentariosRoutes)
app.use('/api/anexos',        anexosRoutes)
app.use('/api/treinamentos',  treinamentosRoutes)
app.use('/api/usuarios',      usuariosRoutes)
app.use('/api/requisicoes',   requisicoesRoutes)
app.use('/api/gamificacao',   gamificacaoRoutes)
app.use('/api/auth/google',   googleAuthRoutes)

// Socket.IO — rooms por usuário
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId
  if (userId) socket.join(`user:${userId}`)

  const { qr, connected, phone } = getWhatsAppStatus()
  if (connected) socket.emit('wa_connected', { phone })
  else if (qr) socket.emit('qr', { qr })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, async () => {
  console.log(`🚀 Backend na porta ${PORT}`)
  await startWhatsApp()
  startSLAJob()
  startLembreteRequisicaoJob()
  startRedirecionamentoJob()
  startTreinamentoStatusJob()
})
