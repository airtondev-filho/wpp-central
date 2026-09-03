import { Router } from 'express'
import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { CONFIG_KEY } from '../services/googleCalendar.js'

const router = Router()
const prisma = new PrismaClient()

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  )
}

// GET /api/auth/google/status — se já existe uma conta Google autorizada (habilita o Meet)
router.get('/status', requireAuth, async (req, res) => {
  const config = await prisma.config.findUnique({ where: { chave: CONFIG_KEY } })
  res.json({ conectado: !!config })
})

// GET /api/auth/google/start — gera a URL de consentimento do Google (autorização única)
router.get('/start', requireRole('ADMIN', 'SUPERVISOR'), (req, res) => {
  const url = getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  })
  res.json({ url })
})

// GET /api/auth/google/callback — o próprio Google chama esta rota após o usuário autorizar
router.get('/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).send('Código de autorização ausente')

  try {
    const { tokens } = await getOAuthClient().getToken(code)
    await prisma.config.upsert({
      where: { chave: CONFIG_KEY },
      update: { valor: JSON.stringify(tokens) },
      create: { chave: CONFIG_KEY, valor: JSON.stringify(tokens) },
    })
    res.redirect('/configuracoes?google=conectado')
  } catch (err) {
    console.error('Erro ao trocar código do Google por tokens:', err)
    res.redirect('/configuracoes?google=erro')
  }
})

export default router
