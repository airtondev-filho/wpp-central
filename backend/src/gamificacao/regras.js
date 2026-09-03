export const PONTOS_BASE_FINALIZADO = 10
export const BONUS_PRIORIDADE = { CRITICO: 15, ALTO: 8, NORMAL: 0 }
export const BONUS_RESPOSTA_RAPIDA = { limiteMin: 5, pontos: 5 }

// Valores padrão usados quando o super admin ainda não configurou nada em Config
// (chaves pontos_atendimento, pontos_reuniao, pontos_requisicao)
export const PONTOS_PADRAO = {
  pontos_atendimento: PONTOS_BASE_FINALIZADO,
  pontos_reuniao: 10,
  pontos_requisicao: 10,
  redirecionamento_bonus: 5,
  redirecionamento_penalidade: 10,
  redirecionamento_prazo_minutos: 15,
}

// Valores padrão usados quando o super admin ainda não configurou os níveis em
// Config (chaves nivel_prata_min, nivel_ouro_min, nivel_diamante_min). Bronze
// sempre começa em 0 pontos e não é configurável.
export const NIVEIS_PADRAO = [
  { nome: 'Bronze',   min: 0 },
  { nome: 'Prata',    min: 100 },
  { nome: 'Ouro',     min: 300 },
  { nome: 'Diamante', min: 700 },
]

export function calcularPontos(atend, pontosBase = PONTOS_BASE_FINALIZADO) {
  let pts = pontosBase + (BONUS_PRIORIDADE[atend.prioridade] ?? 0)
  if (atend.primeiraRespostaEm) {
    const min = (new Date(atend.primeiraRespostaEm) - new Date(atend.aberturaEm)) / 60000
    if (min < BONUS_RESPOSTA_RAPIDA.limiteMin) pts += BONUS_RESPOSTA_RAPIDA.pontos
  }
  return pts
}

export function nivelDe(pontos, niveis = NIVEIS_PADRAO) {
  return [...niveis].reverse().find(n => pontos >= n.min)
}

export function progresso(pontos, niveis = NIVEIS_PADRAO) {
  const atual = nivelDe(pontos, niveis)
  const idx = niveis.indexOf(atual)
  const proximo = niveis[idx + 1] || null
  if (!proximo) return { atual: atual.nome, proximo: null, faltam: 0, pct: 100 }
  const pct = Math.round(((pontos - atual.min) / (proximo.min - atual.min)) * 100)
  return { atual: atual.nome, proximo: proximo.nome, faltam: proximo.min - pontos, pct }
}
