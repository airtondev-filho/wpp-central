export const MISSOES = [
  {
    slug: 'colecionador_badges',
    nome: 'Colecionador',
    descricao: 'Desbloqueie 6 badges diferentes',
    meta: 6,
    icone: 'faTrophy',
    progresso: async (prisma, userId) =>
      prisma.userBadge.count({ where: { userId } }),
  },
  {
    slug: 'multi_grupos',
    nome: 'Poliglota de Grupos',
    descricao: 'Atenda clientes em 20 grupos diferentes',
    meta: 20,
    icone: 'faStar',
    progresso: async (prisma, userId) => {
      const grupos = await prisma.atendimento.findMany({
        where: { agenteId: userId },
        distinct: ['grupoJid'],
        select: { grupoJid: true },
      })
      return grupos.length
    },
  },
  {
    slug: 'melhor_dia',
    nome: 'Foco Total',
    descricao: 'Finalize 25 atendimentos em um único dia',
    meta: 25,
    icone: 'faBolt',
    progresso: async (prisma, userId) => {
      const linhas = await prisma.$queryRaw`
        SELECT COUNT(*)::int as total
        FROM "Atendimento"
        WHERE "agenteId" = ${userId} AND status = 'FINALIZADO'
        GROUP BY DATE_TRUNC('day', "finalizadoEm")
        ORDER BY total DESC
        LIMIT 1
      `
      return linhas[0]?.total ?? 0
    },
  },
  {
    slug: 'ascensao_1000',
    nome: 'Ascensão',
    descricao: 'Alcance 2000 pontos',
    meta: 2000,
    icone: 'faGem',
    progresso: async (prisma, userId) => {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { pontos: true } })
      return u?.pontos ?? 0
    },
  },
]
