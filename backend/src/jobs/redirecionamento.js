import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { io } from '../index.js'
import { obterPontosConfigurados, registrarRedirecionamentoExpirado } from '../gamificacao/servico.js'

const prisma = new PrismaClient()

export function startRedirecionamentoJob() {
  // Roda a cada minuto
  cron.schedule('* * * * *', async () => {
    const { redirecionamento_prazo_minutos: prazo } = await obterPontosConfigurados()
    const limite = new Date(Date.now() - prazo * 60000)

    const pendentes = await prisma.atendimento.findMany({
      where: { redirecionadoPendente: true, redirecionadoEm: { lte: limite } }
    })

    for (const at of pendentes) {
      const atualizado = await prisma.atendimento.update({
        where: { id: at.id },
        data: { redirecionadoPendente: false }
      })

      await prisma.historicoAtendimento.create({
        data: {
          atendId: at.id, tipo: 'AGENTE_CHANGE',
          descricao: `Prazo de redirecionamento expirado sem resposta (${prazo}min)`
        }
      })

      await registrarRedirecionamentoExpirado(atualizado)
      io.emit('atendimento_updated', { atendId: at.id })
    }
  })

  console.log('⏱ Job Redirecionamento iniciado')
}
