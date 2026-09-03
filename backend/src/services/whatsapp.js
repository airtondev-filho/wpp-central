import makeWASocket, {
  useMultiFileAuthState, DisconnectReason,
  fetchLatestBaileysVersion, isJidGroup, jidNormalizedUser
} from '@whiskeysockets/baileys'
import { PrismaClient } from '@prisma/client'
import QRCode from 'qrcode'
import pino from 'pino'
import { io } from '../index.js'
import path from 'path'
import fs from 'fs'
import { registrarRedirecionamentoRespondido } from '../gamificacao/servico.js'

const prisma = new PrismaClient()
const logger = pino({ level: 'silent' })
const AUTH_PATH = path.resolve('./auth_session')

// Último estado conhecido — permite reenviar para sockets que conectam depois do evento original
let lastQR = null
let lastConnectedPhone = null

export function getWhatsAppStatus() {
  return { qr: lastQR, connected: !!lastConnectedPhone, phone: lastConnectedPhone }
}

// Frases que indicam "cliente entendeu/finalizou" para automação simples
const FRASES_FINALIZACAO = [
  'obrigado','obrigada','valeu','entendi','entendido','beleza','blz',
  'ok','certo','perfeito','show','tá bom','tudo bem','resolvido','era isso'
]

export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version, auth: state, logger,
    printQRInTerminal: false,
    browser: ['WPP Central', 'Chrome', '2.0.0'],
    getMessage: async () => undefined
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      lastQR = await QRCode.toDataURL(qr, { margin: 1, width: 280 })
      io.emit('qr', { qr: lastQR })
    }
    if (connection === 'open') {
      lastConnectedPhone = jidNormalizedUser(sock.user?.id)
      lastQR = null
      io.emit('wa_connected', { phone: lastConnectedPhone })
      console.log('✅ WhatsApp conectado:', lastConnectedPhone)
      await syncGrupos(sock)
    }
    if (connection === 'close') {
      lastConnectedPhone = null
      lastQR = null
      io.emit('wa_disconnected', {})
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        console.log('🔒 Sessão deslogada — limpando credenciais para gerar novo QR')
        fs.rmSync(AUTH_PATH, { recursive: true, force: true })
      }
      console.log('🔄 Reconectando em 5s…')
      setTimeout(startWhatsApp, 5000)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      const jid = msg.key?.remoteJid
      if (!jid || !isJidGroup(jid)) continue
      // Curtidas/reações de emoji chegam como reactionMessage — não contam como
      // mensagem nova, senão reabrem o atendimento a cada like do cliente
      if (desembrulhar(msg.message)?.reactionMessage) continue

      try {
      const timestamp    = BigInt(msg.messageTimestamp || 0)
      // participant pode vir como @lid (ID opaco) quando o WhatsApp oculta o número real;
      // participantPn traz o número de telefone de fato quando isso acontece
      const remetente    = msg.key?.participantPn || msg.key?.participant || msg.key?.remoteJid || ''
      const ehMinha      = !!msg.key?.fromMe
      const texto        = extrairTexto(msg)
      const tipo         = extrairTipo(msg)

      // Busca ou cria grupo
      let grupo = await prisma.grupo.findUnique({ where: { jid } })
      if (!grupo) {
        let nome = jid
        try { nome = (await sock.groupMetadata(jid)).subject } catch {}
        grupo = await prisma.grupo.create({ data: { jid, nome } })
      }

      if (grupo.arquivado) continue

      // Busca ou cria atendimento ativo
      let atend = await prisma.atendimento.findFirst({
        where: { grupoJid: jid, status: { in: ['ABERTO','EM_ATENDIMENTO','AGUARDANDO_CLIENTE'] } },
        orderBy: { aberturaEm: 'desc' }
      })

      // Detecta se é agente pelo número
      let agente = null
      const numRem = remetente.split('@')[0].split(':')[0]
      // Reentrega de mensagem sem participante identificado (retry de descriptografia do
      // WhatsApp) — não dá pra saber quem mandou; mantém a autoria de quem falou por último
      const remetenteDesconhecido = !ehMinha && !msg.key?.participant && !msg.key?.participantPn
      if (remetenteDesconhecido && atend?.ehMinha) {
        agente = atend.agenteId ? await prisma.user.findFirst({ where: { id: atend.agenteId } }) : null
      } else if (!ehMinha) {
        agente = await prisma.user.findFirst({ where: { numero: numRem, ativo: true } })
      } else {
        // Mensagem enviada pelo dono do número conectado — considera como agente genérico
        agente = await prisma.user.findFirst({ where: { role: 'ADMIN', ativo: true } })
      }

      const ehAgente = ehMinha || !!agente || (remetenteDesconhecido && !!atend?.ehMinha)

      if (!atend) {
        // Cria novo atendimento
        atend = await prisma.atendimento.create({
          data: {
            grupoJid: jid,
            ultimaMsg: texto,
            ultimoRemetente: remetente,
            ultimoTimestamp: timestamp,
            ehMinha: ehAgente,
            ultimoAgenteNome: ehAgente ? (agente?.nome || 'Agente') : null,
            agenteId: agente?.id || null,
            status: ehAgente ? 'EM_ATENDIMENTO' : 'ABERTO',
            totalMensagens: 1,
            primeiraRespostaEm: ehAgente ? new Date() : null
          }
        })
      } else {
        // Atualiza atendimento existente
        const updates = {
          ultimaMsg: texto,
          ultimoRemetente: remetente,
          ultimoTimestamp: timestamp,
          ehMinha: ehAgente,
          totalMensagens: { increment: 1 }
        }

        // Agente responsável respondendo um atendimento redirecionado pendente
        // — ganha bônus de pontos e encerra a pendência
        const respondeuRedirecionamento = ehAgente && atend.redirecionadoPendente && agente?.id === atend.agenteId

        if (ehAgente) {
          updates.status = 'EM_ATENDIMENTO'
          updates.ultimoAgenteNome = agente?.nome || 'Agente'
          // O último agente a responder assume o atendimento como responsável
          if (agente?.id) updates.agenteId = agente.id
          if (!atend.primeiraRespostaEm) updates.primeiraRespostaEm = new Date()
          // Agente respondeu — zera o timer de prioridade
          updates.aberturaEm = new Date()
          updates.prioridade = 'NORMAL'
          if (respondeuRedirecionamento) updates.redirecionadoPendente = false
        } else {
          updates.status = 'AGUARDANDO_CLIENTE'
          // Cliente mandou msg — reinicia contagem SLA
          updates.aberturaEm = new Date()
          updates.prioridade = 'NORMAL'
        }

        atend = await prisma.atendimento.update({ where: { id: atend.id }, data: updates })

        if (respondeuRedirecionamento) {
          registrarRedirecionamentoRespondido(atend).catch(err => console.error('Erro ao registrar redirecionamento:', err))
        }
      }

      // Salva mensagem
      await prisma.mensagem.create({
        data: {
          atendId: atend.id,
          remetente,
          texto,
          tipo,
          ehAgente,
          agenteId: agente?.id || null
        }
      })

      // Verifica automação de finalização por intenção simples
      const textoLower = texto.toLowerCase().trim()
      const matches = FRASES_FINALIZACAO.some(f => textoLower.includes(f))
      if (matches && texto.length < 60) {
        // Verifica regras de automação ativas — cliente e agente usam gatilhos distintos
        const gatilho = ehAgente ? 'MENSAGEM_AGENTE' : 'MENSAGEM_CLIENTE'
        const regra = await prisma.regraAutomacao.findFirst({
          where: { ativa: true, gatilho, acao: 'FINALIZAR' }
        })
        if (regra) {
          await prisma.atendimento.update({
            where: { id: atend.id },
            data: { status: 'FINALIZADO', finalizadoEm: new Date(), finalizadoPor: 'AUTOMACAO' }
          })
        }
      }

      // Emite para o frontend — ehAgente diferencia mensagem do cliente (toca som)
      // de resposta do próprio agente (não deve notificar)
      io.emit('atendimento_updated', { grupoJid: jid, atendId: atend.id, ehAgente })
      } catch (err) {
        console.error('❌ Erro ao processar mensagem', msg.key?.id, 'de', jid, ':', err)
      }
    }
  })
}

async function syncGrupos(sock) {
  try {
    const groups = await sock.groupFetchAllParticipating()
    for (const [jid, meta] of Object.entries(groups)) {
      await prisma.grupo.upsert({
        where: { jid },
        update: { nome: meta.subject },
        create: { jid, nome: meta.subject }
      })
    }
    console.log(`📦 ${Object.keys(groups).length} grupos sincronizados`)
  } catch(e) { console.error('Sync erro:', e.message) }
}

// Desembrulha envelopes que o WhatsApp usa para mídia efêmera/visualização única
// e mensagens replicadas de outro dispositivo conectado
function desembrulhar(m) {
  while (m) {
    if (m.ephemeralMessage)      { m = m.ephemeralMessage.message; continue }
    if (m.viewOnceMessage)       { m = m.viewOnceMessage.message; continue }
    if (m.viewOnceMessageV2)     { m = m.viewOnceMessageV2.message; continue }
    if (m.viewOnceMessageV2Extension) { m = m.viewOnceMessageV2Extension.message; continue }
    if (m.deviceSentMessage)     { m = m.deviceSentMessage.message; continue }
    break
  }
  return m
}

function extrairTipo(msg) {
  const m = desembrulhar(msg.message)
  if (!m) return 'text'
  if (m.audioMessage)    return 'audio'
  if (m.imageMessage)    return 'image'
  if (m.videoMessage)    return 'video'
  if (m.documentMessage) return 'doc'
  if (m.stickerMessage)  return 'sticker'
  return 'text'
}

function extrairTexto(msg) {
  const m = desembrulhar(msg.message)
  if (!m) return '(mídia)'
  if (m.audioMessage)    return '🎵 Áudio'
  if (m.stickerMessage)  return '🎭 Sticker'
  return m.conversation || m.extendedTextMessage?.text ||
         m.imageMessage?.caption || m.videoMessage?.caption ||
         m.documentMessage?.fileName || '(mídia)'
}
