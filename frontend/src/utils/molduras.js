import { faStar, faMedal, faTrophy, faFire, faBolt, faCrown, faGem } from '@fortawesome/free-solid-svg-icons'

// Tema visual de cada moldura, indexado pelo slug do badge/missão que a desbloqueia.
// O catálogo de quais slugs existem e quando desbloqueiam vive no backend
// (gamificacao/badges.js, gamificacao/missoes.js) — aqui só o "como desenhar".
export const MOLDURA_TEMA = {
  // badges
  primeiro_atendimento: { cor: '#cbd5e1', corSuave: 'rgba(203,213,225,0.4)', icone: faStar },
  veterano_50:          { cor: '#cd7f32', corSuave: 'rgba(205,127,50,0.4)',  icone: faMedal },
  centuriao_100:        { cor: '#facc15', corSuave: 'rgba(250,204,21,0.45)', icone: faTrophy },
  apagador_incendio:    { cor: '#f97316', corSuave: 'rgba(239,68,68,0.45)',  icone: faFire },
  resposta_relampago:   { cor: '#38bdf8', corSuave: 'rgba(56,189,248,0.45)', icone: faBolt },
  nivel_ouro:           { cor: '#fbbf24', corSuave: 'rgba(251,191,36,0.5)',  icone: faCrown },
  nivel_diamante:       { cor: '#a78bfa', corSuave: 'rgba(167,139,250,0.5)', icone: faGem },
  // missões
  colecionador_badges:  { cor: '#c084fc', corSuave: 'rgba(192,132,252,0.45)', icone: faTrophy },
  multi_grupos:         { cor: '#34d399', corSuave: 'rgba(52,211,153,0.45)',  icone: faStar },
  melhor_dia:           { cor: '#fb923c', corSuave: 'rgba(251,146,60,0.45)',  icone: faBolt },
  ascensao_1000:        { cor: '#f472b6', corSuave: 'rgba(244,114,182,0.5)',  icone: faGem },
}

export function temaMoldura(slug) {
  return (slug && MOLDURA_TEMA[slug]) || null
}

// Texto do título — só as 4 missões dão baú (e por tanto título/banner).
// Precisa espelhar os nomes de gamificacao/missoes.js no backend.
export const MISSAO_TITULO = {
  colecionador_badges: 'Colecionador',
  multi_grupos:        'Poliglota de Grupos',
  melhor_dia:           'Foco Total',
  ascensao_1000:        'Ascensão',
}

export function textoTitulo(slug) {
  return (slug && MISSAO_TITULO[slug]) || null
}
