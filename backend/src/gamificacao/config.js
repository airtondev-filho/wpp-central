import { PrismaClient } from '@prisma/client'
import { NIVEIS_PADRAO } from './regras.js'

const prisma = new PrismaClient()

// Bronze é fixo em 0 pontos (piso). Só os demais níveis são configuráveis.
const CHAVE_POR_NIVEL = { Prata: 'nivel_prata_min', Ouro: 'nivel_ouro_min', Diamante: 'nivel_diamante_min' }

// Lê os pontos mínimos de cada nível configurados pelo super admin em
// Configurações, com fallback para NIVEIS_PADRAO quando ainda não foi
// configurado. Retorna sempre ordenado ascendente por min.
export async function obterNiveisConfigurados() {
  const chaves = Object.values(CHAVE_POR_NIVEL)
  const linhas = await prisma.config.findMany({ where: { chave: { in: chaves } } })
  const configurado = Object.fromEntries(linhas.map(l => [l.chave, Number(l.valor)]))
  return NIVEIS_PADRAO
    .map(n => ({ nome: n.nome, min: configurado[CHAVE_POR_NIVEL[n.nome]] ?? n.min }))
    .sort((a, b) => a.min - b.min)
}
