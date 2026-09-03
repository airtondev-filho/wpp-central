import { faStar, faMedal, faTrophy, faFire, faBolt, faCrown, faGem, faChild, faPersonCane } from '@fortawesome/free-solid-svg-icons'

export const ICONE_MAP = { faStar, faMedal, faTrophy, faFire, faBolt, faCrown, faGem, faChild, faPersonCane }

export function iconeDe(nome) {
  return ICONE_MAP[nome] || faMedal
}
