import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faRotateLeft, faCalendar, faTrash, faListCheck, faComment, faPaperclip } from '@fortawesome/free-solid-svg-icons'
import PrioridadeBadge from './PrioridadeBadge.jsx'

function formatData(iso) {
  if (!iso) return null
  // prazo é um campo "só data" (input type=date) armazenado como UTC-midnight —
  // usar getUTCDate/getUTCMonth evita virar um dia por causa do fuso local.
  const d = new Date(iso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

export default function TarefaCard({ tarefa, onEditar, onConcluir, onExcluir, arrastavel = true }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `tarefa-${tarefa.id}`,
    data: { type: 'tarefa', tarefaId: tarefa.id, listaId: tarefa.listaId },
    disabled: !arrastavel,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const concluida = Boolean(tarefa.concluidoEm)
  const atrasada = !concluida && tarefa.prazo && new Date(tarefa.prazo) < new Date()
  const dragProps = arrastavel ? { ...attributes, ...listeners } : {}

  const checklistTotal = tarefa.checklist?.length || 0
  const checklistFeitos = tarefa.checklist?.filter(i => i.concluido).length || 0
  const totalComentarios = tarefa._count?.comentarios || 0
  const totalAnexos = tarefa._count?.anexos || 0

  return (
    <div ref={setNodeRef} style={style} {...dragProps}
      className={`glass rounded-xl p-3.5 flex flex-col gap-2.5 group touch-none ${arrastavel ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <button onPointerDown={e => e.stopPropagation()} onClick={() => onEditar(tarefa)}
          className={`text-sm font-medium text-left flex-1 ${concluida ? 'text-ink/40 line-through' : 'text-ink/90'}`}>
          {tarefa.titulo}
        </button>
        <button onPointerDown={e => e.stopPropagation()} onClick={() => onConcluir(tarefa.id)}
          title={concluida ? 'Reabrir' : 'Concluir'}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 transition-colors ${
            concluida ? 'bg-accent/20 text-accent' : 'text-ink/20 hover:text-accent hover:bg-accent/10'
          }`}>
          <FontAwesomeIcon icon={concluida ? faRotateLeft : faCheck} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <PrioridadeBadge prioridade={tarefa.prioridade} />
        {tarefa.prazo && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            atrasada ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-ink/40 bg-ink/5 border-ink/10'
          }`}>
            <FontAwesomeIcon icon={faCalendar} className="text-[10px]" /> {formatData(tarefa.prazo)}
          </span>
        )}
      </div>

      {tarefa.tags?.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {tarefa.tags.map(t => (
            <span key={t.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ color: t.cor, background: `${t.cor}1a` }}>{t.nome}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-ink/40">
        <span className="truncate">{tarefa.responsavel ? tarefa.responsavel.nome : '— sem responsável'}</span>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {checklistTotal > 0 && (
            <span className={`flex items-center gap-1 ${checklistFeitos === checklistTotal ? 'text-accent' : ''}`}>
              <FontAwesomeIcon icon={faListCheck} className="text-[10px]" /> {checklistFeitos}/{checklistTotal}
            </span>
          )}
          {totalComentarios > 0 && (
            <span className="flex items-center gap-1"><FontAwesomeIcon icon={faComment} className="text-[10px]" /> {totalComentarios}</span>
          )}
          {totalAnexos > 0 && (
            <span className="flex items-center gap-1"><FontAwesomeIcon icon={faPaperclip} className="text-[10px]" /> {totalAnexos}</span>
          )}
          <button onPointerDown={e => e.stopPropagation()} onClick={() => onExcluir(tarefa.id)}
            className="opacity-0 group-hover:opacity-100 text-ink/20 hover:text-red-400 transition-all">
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>
    </div>
  )
}
