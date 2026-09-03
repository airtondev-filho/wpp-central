import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@central.com' },
    update: {},
    create: { nome: 'Administrador', email: 'admin@central.com', senha: hash, role: 'ADMIN' }
  })

  // Config padrão SLA
  const configs = { sla_normal: '10', sla_alto: '30' }
  for (const [chave, valor] of Object.entries(configs)) {
    await prisma.config.upsert({ where: { chave }, update: {}, create: { chave, valor } })
  }

  // Intenção padrão: cliente finalizou
  await prisma.intencao.upsert({
    where: { nome: 'Cliente finalizou' },
    update: {},
    create: {
      nome: 'Cliente finalizou',
      descricao: 'Cliente demonstrou que o problema foi resolvido',
      frases: ['obrigado','obrigada','valeu','entendi','beleza','resolvido','era isso','perfeito','ok','show']
    }
  })

  // Regra padrão: finalizar automaticamente
  const intencao = await prisma.intencao.findUnique({ where: { nome: 'Cliente finalizou' } })
  const existeRegra = await prisma.regraAutomacao.findFirst({ where: { nome: 'Auto-finalizar' } })
  if (!existeRegra) {
    await prisma.regraAutomacao.create({
      data: {
        nome: 'Auto-finalizar',
        gatilho: 'MENSAGEM_CLIENTE',
        intencaoId: intencao.id,
        confiancaMin: 0.85,
        acao: 'FINALIZAR',
        ativa: false // desativado por padrão — admin ativa quando quiser
      }
    })
  }

  console.log('✅ Seed concluído')
  console.log('   Admin: admin@central.com / admin123')
}

main().finally(() => prisma.$disconnect())
