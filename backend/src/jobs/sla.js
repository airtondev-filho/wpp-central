import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { io } from '../index.js'

const prisma = new PrismaClient()

// Defaults globais (minutos)
const DEFAULT_SLA_NORMAL  = 10  // NORMAL → ALTO
const DEFAULT_SLA_ALTO    = 30  // ALTO   → CRITICO

export function startSLAJob() {
  // Roda a cada minuto
  cron.schedule('* * * * *', async () => {
    const agora = new Date()

    const abertos = await prisma.atendimento.findMany({
      where: {
        status: { in: ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE'] },
        prioridade: { not: 'CRITICO' },
        ehMinha: false  // só conta quando cliente foi o último
      },
      include: { grupo: true }
    })

    for (const at of abertos) {
      const minutos = (agora - at.aberturaEm) / 60000
      const slaNormal = at.grupo.slaNormal ?? DEFAULT_SLA_NORMAL
      const slaAlto   = at.grupo.slaAlto   ?? DEFAULT_SLA_ALTO

      let novaPrioridade = at.prioridade

      if (at.prioridade === 'NORMAL' && minutos >= slaNormal) {
        novaPrioridade = 'ALTO'
      } else if (at.prioridade === 'ALTO' && minutos >= slaAlto) {
        novaPrioridade = 'CRITICO'
      }

      if (novaPrioridade !== at.prioridade) {
        await prisma.atendimento.update({
          where: { id: at.id },
          data: { prioridade: novaPrioridade }
        })

        await prisma.historicoAtendimento.create({
          data: {
            atendId: at.id,
            tipo: 'PRIORIDADE_CHANGE',
            de: at.prioridade,
            para: novaPrioridade,
            descricao: `Escalado automaticamente por SLA (${Math.floor(minutos)}min)`
          }
        })

        // Emite evento em tempo real
        io.emit('prioridade_changed', { atendId: at.id, prioridade: novaPrioridade })

        // Notifica agente responsável
        if (at.agenteId) {
          await prisma.notificacao.create({
            data: {
              userId: at.agenteId,
              tipo: novaPrioridade === 'CRITICO' ? 'ATEND_CRITICO' : 'ATEND_ALTO',
              titulo: `Atendimento escalado para ${novaPrioridade}`,
              corpo: `Grupo: ${at.grupo.nome} — ${Math.floor(minutos)} minutos sem resposta`,
              atendId: at.id
            }
          })
          io.to(`user:${at.agenteId}`).emit('notificacao')
        }
      }
    }
  })

  console.log('⏱ Job SLA iniciado')
}
