import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faGripVertical } from '@fortawesome/free-solid-svg-icons'
import TarefaCard from './TarefaCard.jsx'

export default function ListaColuna({ lista, tarefas, onAdicionarTarefa, onEditarTarefa, onConcluirTarefa, onExcluirTarefa, arrastavel = true }) {
  const sortable = useSortable({
    id: `lista-${lista.id}`,
    data: { type: 'lista', listaId: lista.id },
  })
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `lista-body-${lista.id}`,
    data: { type: 'lista-body', listaId: lista.id },
  })

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  }

  const ids = tarefas.map(t => `tarefa-${t.id}`)

  return (
    <div ref={sortable.setNodeRef} style={style} className="w-80 flex-shrink-0 flex flex-col gap-3">
      <div {...sortable.attributes} {...sortable.listeners}
        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-ink/5 border border-ink/10 cursor-grab active:cursor-grabbing touch-none">
        <span className="text-sm font-semibold text-ink/80">
          <FontAwesomeIcon icon={faGripVertical} className="mr-2 text-ink/20" />
          {lista.nome}
        </span>
        <span className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full bg-ink/10 text-ink/60">
          {tarefas.length}
        </span>
      </div>

      <button onClick={() => onAdicionarTarefa(lista.id)}
        className="text-xs text-ink/30 hover:text-accent transition-colors text-left px-1">
        <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Adicionar tarefa
      </button>

      <div ref={setDroppableRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 min-h-[2rem]">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tarefas.map(tarefa => (
            <TarefaCard key={tarefa.id} tarefa={{ ...tarefa, listaId: lista.id }} arrastavel={arrastavel}
              onEditar={onEditarTarefa} onConcluir={onConcluirTarefa} onExcluir={onExcluirTarefa} />
          ))}
        </SortableContext>
        {!tarefas.length && (
          <div className="text-center py-6 text-ink/20 text-xs">Nenhuma tarefa</div>
        )}
      </div>
    </div>
  )
}
