import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { io } from '../index.js'

const prisma = new PrismaClient()

function formatarTempo(diffMs) {
  const diffMin = Math.round(Math.abs(diffMs) / 60000)
  if (diffMin < 60) return `${diffMin} min`
  const diffHoras = Math.round(diffMin / 60)
  if (diffHoras < 24) return `${diffHoras}h`
  return `${Math.round(diffHoras / 24)} dia(s)`
}

export function startLembreteRequisicaoJob() {
  // Roda a cada minuto
  cron.schedule('* * * * *', async () => {
    const agora = new Date()

    const requisicoes = await prisma.requisicao.findMany({
      where: {
        status: { not: 'CONCLUIDA' },
        prazo: { not: null },
        avisoIntervaloMinutos: { not: null },
      },
      include: { responsavel: true, criador: true, grupo: true },
    })

    for (const req of requisicoes) {
      const referencia = req.ultimoAvisoEm ?? req.criadoEm
      const minutosDesdeUltimoAviso = (agora - referencia) / 60000
      if (minutosDesdeUltimoAviso < req.avisoIntervaloMinutos) continue

      const destinatario = req.responsavel ?? req.criador
      if (!destinatario) continue

      const diffMs = req.prazo - agora
      const atrasada = diffMs < 0
      const corpo = atrasada
        ? `"${req.nome}" (${req.grupo.nome}) está atrasada há ${formatarTempo(diffMs)}`
        : `"${req.nome}" (${req.grupo.nome}) vence em ${formatarTempo(diffMs)}`

      await prisma.notificacao.create({
        data: {
          userId: destinatario.id,
          tipo: atrasada ? 'REQUISICAO_ATRASADA' : 'REQUISICAO_PROXIMA',
          titulo: atrasada ? 'Requisição atrasada' : 'Requisição próxima do prazo',
          corpo,
        },
      })

      await prisma.requisicao.update({ where: { id: req.id }, data: { ultimoAvisoEm: agora } })

      io.to(`user:${destinatario.id}`).emit('notificacao')
    }
  })

  console.log('⏰ Job de lembrete de requisições iniciado')
}
