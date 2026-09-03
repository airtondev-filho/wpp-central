import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAnglesDown, faEquals, faAnglesUp, faFire } from '@fortawesome/free-solid-svg-icons'

const MAP = {
  BAIXA:   { cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',    icon: faAnglesDown, label: 'Baixa'   },
  MEDIA:   { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: faEquals,     label: 'Média'   },
  ALTA:    { cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: faAnglesUp, label: 'Alta'    },
  URGENTE: { cls: 'text-red-400 bg-red-400/10 border-red-400/20',       icon: faFire,       label: 'Urgente' },
}

export default function PrioridadeBadge({ prioridade, className = '' }) {
  const { cls, icon, label } = MAP[prioridade] || MAP.MEDIA
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls} ${className}`}>
      <FontAwesomeIcon icon={icon} className="text-[10px]" /> {label}
    </span>
  )
}

export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']
