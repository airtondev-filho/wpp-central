import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons'
import { PRIORIDADES } from './PrioridadeBadge.jsx'

const LABEL_PRIORIDADE = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }

const TOGGLES = [
  { key: 'minhas',         label: 'Minhas tarefas' },
  { key: 'atrasadas',      label: 'Atrasadas' },
  { key: 'semResponsavel', label: 'Sem responsável' },
]

export default function FiltrosBar({ membros, filtros, onChange }) {
  const [busca, setBusca] = useState(filtros.busca)

  // debounce da busca — evita disparar o filtro a cada tecla
  useEffect(() => {
    const t = setTimeout(() => onChange({ busca }), 300)
    return () => clearTimeout(t)
  }, [busca])

  const set = (patch) => onChange(patch)
  const toggle = (key) => onChange({ [key]: !filtros[key] })

  const algumAtivo = filtros.busca || filtros.responsavelId || filtros.prioridade
    || filtros.minhas || filtros.atrasadas || filtros.semResponsavel

  const limpar = () => {
    setBusca('')
    onChange({ busca: '', responsavelId: '', prioridade: '', minhas: false, atrasadas: false, semResponsavel: false })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
      <div className="relative">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 text-xs" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar tarefas…"
          className="input-glass pl-9 pr-4 py-2 text-sm rounded-xl w-56" />
      </div>

      <select value={filtros.responsavelId} onChange={e => set({ responsavelId: e.target.value })}
        className="input-glass px-3 py-2 text-xs rounded-xl">
        <option value="" className="bg-[var(--surface)]">Responsável: Todos</option>
        {membros.map(m => <option key={m.id} value={m.id} className="bg-[var(--surface)]">{m.nome}</option>)}
      </select>

      <select value={filtros.prioridade} onChange={e => set({ prioridade: e.target.value })}
        className="input-glass px-3 py-2 text-xs rounded-xl">
        <option value="" className="bg-[var(--surface)]">Prioridade: Todas</option>
        {PRIORIDADES.map(p => <option key={p} value={p} className="bg-[var(--surface)]">{LABEL_PRIORIDADE[p]}</option>)}
      </select>

      {TOGGLES.map(t => (
        <button key={t.key} onClick={() => toggle(t.key)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            filtros[t.key] ? 'bg-accent/15 text-accent border border-accent/30' : 'text-ink/40 border border-transparent hover:text-ink/70'
          }`}>{t.label}</button>
      ))}

      {algumAtivo && (
        <button onClick={limpar} className="text-xs text-ink/30 hover:text-ink/60 transition-colors ml-1">
          <FontAwesomeIcon icon={faXmark} className="mr-1" /> Limpar filtros
        </button>
      )}
    </div>
  )
}
