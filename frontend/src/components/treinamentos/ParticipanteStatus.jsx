import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCircleHalfStroke, faCircle } from '@fortawesome/free-solid-svg-icons'

export const STATUS_PARTICIPANTE = ['NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO']

const MAP = {
  NAO_INICIADO: { cls: 'text-ink/30', icon: faCircle,           label: 'Não iniciado' },
  EM_ANDAMENTO: { cls: 'text-amber-400', icon: faCircleHalfStroke, label: 'Em andamento' },
  CONCLUIDO:    { cls: 'text-accent',    icon: faCircleCheck,      label: 'Concluído'    },
}

export default function ParticipanteStatus({ status, className = '' }) {
  const { cls, icon, label } = MAP[status] || MAP.NAO_INICIADO
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${cls} ${className}`}>
      <FontAwesomeIcon icon={icon} /> {label}
    </span>
  )
}
