import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE

export const CONFIG_KEY = 'google_oauth_tokens'

// Conta autorizada via OAuth (uma conta Google de verdade) — necessária para criar
// salas do Google Meet, algo que uma conta de serviço não tem permissão de fazer.
async function getOAuthClient() {
  const config = await prisma.config.findUnique({ where: { chave: CONFIG_KEY } })
  if (!config) return null

  const tokens = JSON.parse(config.valor)
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  )
  client.setCredentials(tokens)
  client.on('tokens', (novosTokens) => {
    prisma.config.update({
      where: { chave: CONFIG_KEY },
      data: { valor: JSON.stringify({ ...tokens, ...novosTokens }) },
    }).catch(err => console.error('Erro ao salvar tokens renovados do Google:', err))
  })
  return client
}

function getServiceAccountClient() {
  if (!KEY_FILE) return null
  const credentials = JSON.parse(readFileSync(KEY_FILE, 'utf-8'))
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

// Prefere a conta OAuth (suporta Meet); cai para a conta de serviço quando a
// autorização OAuth ainda não foi feita (não cria Meet, mas sincroniza o evento).
async function getAuth() {
  const oauth = await getOAuthClient()
  if (oauth) return { auth: oauth, suportaMeet: true }
  const serviceAccount = getServiceAccountClient()
  if (serviceAccount) return { auth: serviceAccount, suportaMeet: false }
  return null
}

function toEventBody(treinamento) {
  const inicio = treinamento.data ? new Date(treinamento.data) : new Date()
  const fim = new Date(inicio.getTime() + (treinamento.duracaoMin || 60) * 60000)

  return {
    summary: treinamento.nome,
    description: [treinamento.descricao, treinamento.conteudo].filter(Boolean).join('\n\n') || undefined,
    start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
  }
}

// Cria o evento (com uma sala do Google Meet, quando a conta OAuth está conectada) na Google Agenda.
// Retorna { eventId, meetLink } ou null se a integração não estiver configurada.
export async function criarEvento(treinamento) {
  if (!CALENDAR_ID) return null
  const ctx = await getAuth()
  if (!ctx) return null

  const calendar = google.calendar({ version: 'v3', auth: ctx.auth })
  const requestBody = toEventBody(treinamento)
  if (ctx.suportaMeet) {
    requestBody.conferenceData = {
      createRequest: { requestId: `treinamento-${treinamento.id}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    }
  }

  const { data } = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    conferenceDataVersion: ctx.suportaMeet ? 1 : undefined,
    requestBody,
  })

  const meetLink = data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null
  return { eventId: data.id, meetLink }
}

// Usa PATCH (não PUT) para não sobrescrever o link do Meet já gerado no evento.
export async function atualizarEvento(treinamento) {
  if (!CALENDAR_ID || !treinamento.googleEventId) return
  const ctx = await getAuth()
  if (!ctx) return

  const calendar = google.calendar({ version: 'v3', auth: ctx.auth })
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId: treinamento.googleEventId,
    requestBody: toEventBody(treinamento),
  })
}

export async function excluirEvento(treinamento) {
  if (!CALENDAR_ID || !treinamento.googleEventId) return
  const ctx = await getAuth()
  if (!ctx) return

  const calendar = google.calendar({ version: 'v3', auth: ctx.auth })
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: treinamento.googleEventId })
  } catch (err) {
    if (err.code !== 404 && err.code !== 410) throw err
  }
}
