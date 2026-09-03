import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLightbulb, faCalendarDays, faHourglassHalf, faCircleCheck, faBan } from '@fortawesome/free-solid-svg-icons'

export const STATUS_TREINAMENTO = ['PLANEJADO', 'AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']

const MAP = {
  PLANEJADO:    { cls: 'text-ink/50 bg-ink/5 border-ink/10',        icon: faLightbulb,      label: 'Planejado'    },
  AGENDADO:     { cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: faCalendarDays,    label: 'Agendado'     },
  EM_ANDAMENTO: { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: faHourglassHalf, label: 'Em andamento' },
  CONCLUIDO:    { cls: 'text-accent bg-accent/10 border-accent/20',       icon: faCircleCheck,    label: 'Concluído'    },
  CANCELADO:    { cls: 'text-red-400 bg-red-400/10 border-red-400/20',    icon: faBan,             label: 'Cancelado'    },
}

export default function StatusTreinamentoBadge({ status, className = '' }) {
  const { cls, icon, label } = MAP[status] || MAP.PLANEJADO
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls} ${className}`}>
      <FontAwesomeIcon icon={icon} className={`text-[10px] ${status === 'EM_ANDAMENTO' ? 'animate-hourglass' : ''}`} /> {label}
    </span>
  )
}
