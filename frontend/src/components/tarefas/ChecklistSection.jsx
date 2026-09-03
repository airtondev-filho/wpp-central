import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSquareCheck, faSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons'

export default function ChecklistSection({ tarefaId, itens, authHeaders, onChange }) {
  const [novoTitulo, setNovoTitulo] = useState('')

  const total = itens.length
  const feitos = itens.filter(i => i.concluido).length
  const pct = total ? Math.round((feitos / total) * 100) : 0

  const adicionar = async () => {
    if (!novoTitulo.trim()) return
    await fetch(`/api/tarefas/${tarefaId}/checklist`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ titulo: novoTitulo }),
    })
    setNovoTitulo('')
    onChange()
  }

  const toggle = async (item) => {
    await fetch(`/api/checklist/${item.id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ concluido: !item.concluido }),
    })
    onChange()
  }

  const excluir = async (itemId) => {
    await fetch(`/api/checklist/${itemId}`, { method: 'DELETE', headers: authHeaders() })
    onChange()
  }

  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-xs text-ink/40 uppercase tracking-wider">Checklist</h4>

      {total > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-ink/40 flex-shrink-0">{feitos}/{total}</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {itens.map(item => (
          <div key={item.id} className="flex items-center gap-2 group px-1 py-1 rounded-lg hover:bg-ink/5">
            <button onClick={() => toggle(item)} className={item.concluido ? 'text-accent' : 'text-ink/30 hover:text-ink/60'}>
              <FontAwesomeIcon icon={item.concluido ? faSquareCheck : faSquare} />
            </button>
            <span className={`flex-1 text-sm ${item.concluido ? 'text-ink/40 line-through' : 'text-ink/80'}`}>{item.titulo}</span>
            <button onClick={() => excluir(item.id)}
              className="opacity-0 group-hover:opacity-100 text-ink/20 hover:text-red-400 transition-all">
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && adicionar()}
          placeholder="Adicionar item…"
          className="input-glass px-3 py-1.5 text-sm w-full rounded-lg" />
        <button onClick={adicionar} className="px-3 py-1.5 text-xs bg-accent text-black font-semibold rounded-lg hover:opacity-90 flex-shrink-0">
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  )
}
