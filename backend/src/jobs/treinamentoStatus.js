import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { io } from '../index.js'

const prisma = new PrismaClient()

const DEFAULT_DURACAO_MIN = 60

export function startTreinamentoStatusJob() {
  // Roda a cada minuto
  cron.schedule('* * * * *', async () => {
    const agora = new Date()

    const treinamentos = await prisma.treinamento.findMany({
      where: {
        status: { in: ['PLANEJADO', 'AGENDADO', 'EM_ANDAMENTO'] },
        data: { not: null },
      },
    })

    for (const t of treinamentos) {
      const fim = new Date(t.data.getTime() + (t.duracaoMin ?? DEFAULT_DURACAO_MIN) * 60000)

      let novoStatus = t.status
      if (agora >= fim) {
        novoStatus = 'CONCLUIDO'
      } else if (agora >= t.data) {
        novoStatus = 'EM_ANDAMENTO'
      }

      if (novoStatus !== t.status) {
        await prisma.treinamento.update({
          where: { id: t.id },
          data: { status: novoStatus },
        })

        io.emit('treinamento_updated', { treinamentoId: t.id })
      }
    }
  })

  console.log('📅 Job de status automático de treinamentos iniciado')
}
