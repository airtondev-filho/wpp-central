import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Atendimentos abertos pelo cliente (agenteId nulo) mas que já têm mensagens
// de um agente identificado ficavam fora da pontuação/ranking. Este script
// atribui o primeiro agente que respondeu a cada um desses atendimentos.
async function main() {
  const pendentes = await prisma.atendimento.findMany({
    where: { agenteId: null },
    select: { id: true }
  })

  let corrigidos = 0
  for (const { id } of pendentes) {
    const primeiraMsgAgente = await prisma.mensagem.findFirst({
      where: { atendId: id, agenteId: { not: null } },
      orderBy: { timestamp: 'asc' },
      select: { agenteId: true }
    })
    if (!primeiraMsgAgente) continue

    await prisma.atendimento.update({
      where: { id },
      data: { agenteId: primeiraMsgAgente.agenteId }
    })
    corrigidos++
  }

  console.log(`Atendimentos verificados: ${pendentes.length}`)
  console.log(`Atendimentos corrigidos: ${corrigidos}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
