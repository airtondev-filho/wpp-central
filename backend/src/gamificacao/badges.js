import { obterNiveisConfigurados } from './config.js'

export const BADGES = [
  {
    slug: 'primeiro_atendimento',
    nome: 'Primeiro Passo',
    descricao: 'Finalize seu primeiro atendimento',
    icone: 'faStar',
    check: async (prisma, userId) =>
      (await prisma.atendimento.count({ where: { agenteId: userId, status: 'FINALIZADO' } })) >= 1,
  },
  {
    slug: 'veterano_50',
    nome: 'Veterano',
    descricao: 'Finalize 150 atendimentos',
    icone: 'faMedal',
    check: async (prisma, userId) =>
      (await prisma.atendimento.count({ where: { agenteId: userId, status: 'FINALIZADO' } })) >= 150,
  },
  {
    slug: 'centuriao_100',
    nome: 'Centurião',
    descricao: 'Finalize 350 atendimentos',
    icone: 'faTrophy',
    check: async (prisma, userId) =>
      (await prisma.atendimento.count({ where: { agenteId: userId, status: 'FINALIZADO' } })) >= 350,
  },
  {
    slug: 'apagador_incendio',
    nome: 'Apagador de Incêndio',
    descricao: 'Finalize 30 atendimentos críticos',
    icone: 'faFire',
    check: async (prisma, userId) =>
      (await prisma.atendimento.count({ where: { agenteId: userId, status: 'FINALIZADO', prioridade: 'CRITICO' } })) >= 30,
  },
  {
    slug: 'resposta_relampago',
    nome: 'Resposta Relâmpago',
    descricao: 'Tempo médio de resposta abaixo de 2min nos últimos 30 atendimentos',
    icone: 'faBolt',
    check: async (prisma, userId) => {
      const recentes = await prisma.atendimento.findMany({
        where: { agenteId: userId, status: 'FINALIZADO', primeiraRespostaEm: { not: null } },
        select: { aberturaEm: true, primeiraRespostaEm: true },
        orderBy: { finalizadoEm: 'desc' },
        take: 30,
      })
      if (recentes.length < 30) return false
      const mediaMin = recentes.reduce((acc, a) =>
        acc + (new Date(a.primeiraRespostaEm) - new Date(a.aberturaEm)) / 60000, 0) / recentes.length
      return mediaMin < 2
    },
  },
  {
    slug: 'nivel_ouro',
    nome: 'Nível Ouro',
    descricao: 'Alcance o nível Ouro',
    icone: 'faCrown',
    check: async (prisma, userId) => {
      const [u, niveis] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { pontos: true } }),
        obterNiveisConfigurados()
      ])
      const min = niveis.find(n => n.nome === 'Ouro')?.min ?? 300
      return (u?.pontos ?? 0) >= min
    },
  },
  {
    slug: 'nivel_diamante',
    nome: 'Lenda',
    descricao: 'Alcance o nível Diamante',
    icone: 'faGem',
    check: async (prisma, userId) => {
      const [u, niveis] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { pontos: true } }),
        obterNiveisConfigurados()
      ])
      const min = niveis.find(n => n.nome === 'Diamante')?.min ?? 700
      return (u?.pontos ?? 0) >= min
    },
  },
  {
    // Easter egg: nunca é liberada pelo fluxo normal de creditarPontos
    // (check sempre falso). É concedida manualmente via
    // servico.registrarEasterEggPequenino, chamada pelo front quando o
    // usuário clica 20 vezes no agente de número 556299320983 na tela de Agentes.
    slug: 'o_pequenino',
    nome: 'O Pequenino',
    descricao: 'Um segredo que poucos descobrem...',
    icone: 'faChild',
    oculta: true, // não aparece na lista de badges enquanto não for desbloqueada
    check: async () => false,
  },
  {
    // Easter egg: nunca é liberada pelo fluxo normal de creditarPontos
    // (check sempre falso). É concedida manualmente via
    // servico.registrarEasterEggIdosoMaster, chamada pelo front quando o
    // usuário clica 20 vezes no agente de número 556282386452 na tela de Agentes.
    slug: 'idoso_master_meme',
    nome: 'IDOSO MASTER MEME',
    descricao: 'O mais velho de todos, uma lenda viva.',
    icone: 'faPersonCane',
    oculta: true, // não aparece na lista de badges enquanto não for desbloqueada
    check: async () => false,
  },
]
