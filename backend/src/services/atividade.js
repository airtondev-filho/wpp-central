import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function registrarAtividade({ tarefaId, autorId, tipo, descricao }) {
  return prisma.tarefaAtividade.create({ data: { tarefaId, autorId, tipo, descricao } })
}
