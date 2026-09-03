import React, { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTrash, faCheck, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../../stores/index.js'
import { PRIORIDADES } from './PrioridadeBadge.jsx'
import TagsPicker from './TagsPicker.jsx'
import ChecklistSection from './ChecklistSection.jsx'
import ComentariosSection from './ComentariosSection.jsx'
import AnexosSection from './AnexosSection.jsx'
import AtividadeFeed from './AtividadeFeed.jsx'

const LABEL_PRIORIDADE = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }

export default function TarefaDrawer({ tarefaId, membros, onClose, onChanged }) {
  const { authHeaders, user, token } = useAuthStore()
  const [tarefa, setTarefa] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/tarefas/${tarefaId}`, { headers: authHeaders() })
    if (!r.ok) return
    const data = await r.json()
    setTarefa(data)
    setTitulo(data.titulo)
    setDescricao(data.descricao || '')
  }, [tarefaId])

  useEffect(() => { load() }, [load])

  const atualizar = async (patch) => {
    await fetch(`/api/tarefas/${tarefaId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(patch) })
    await load()
    onChanged?.()
  }

  const alterarChecklist = async () => { await load(); onChanged?.() }

  const concluir = async () => {
    await fetch(`/api/tarefas/${tarefaId}/concluir`, { method: 'PATCH', headers: authHeaders() })
    await load()
    onChanged?.()
  }

  const excluir = async () => {
    if (!confirm('Excluir esta tarefa? Essa ação não pode ser desfeita.')) return
    await fetch(`/api/tarefas/${tarefaId}`, { method: 'DELETE', headers: authHeaders() })
    onChanged?.()
    onClose()
  }

  const isSupervisor = ['ADMIN', 'SUPERVISOR'].includes(user?.role)

  if (!tarefa) {
    return (
      <div className="overlay-backdrop fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.7)', '--overlay-blur': '6px' }}>
        <div className="glass-strong h-full w-full max-w-lg flex items-center justify-center text-ink/30 text-sm">Carregando…</div>
      </div>
    )
  }

  const concluida = Boolean(tarefa.concluidoEm)

  return (
    <div className="overlay-backdrop fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.7)', '--overlay-blur': '6px' }}
      onClick={onClose}>
      <div className="glass-strong h-full w-full max-w-lg flex flex-col shadow-glass" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 8%)' }}>
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            onBlur={() => titulo.trim() && titulo !== tarefa.titulo && atualizar({ titulo })}
            className={`flex-1 bg-transparent text-base font-bold outline-none border-b border-transparent focus:border-ink/20 pb-1 ${
              concluida ? 'text-ink/40 line-through' : 'text-ink'
            }`} />
          <button onClick={onClose} className="text-ink/30 hover:text-ink text-lg leading-none flex-shrink-0">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Ações rápidas */}
          <div className="flex items-center gap-2">
            <button onClick={concluir}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                concluida ? 'bg-ink/10 text-ink/60 hover:bg-ink/15' : 'bg-accent/15 text-accent hover:bg-accent/25'
              }`}>
              <FontAwesomeIcon icon={concluida ? faRotateLeft : faCheck} className="mr-1.5" />
              {concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
            </button>
            <button onClick={excluir}
              className="ml-auto px-3 py-1.5 text-xs text-ink/30 hover:text-red-400 transition-colors">
              <FontAwesomeIcon icon={faTrash} className="mr-1.5" /> Excluir
            </button>
          </div>

          {/* Campos principais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Responsável</label>
              <select value={tarefa.responsavelId || ''} onChange={e => atualizar({ responsavelId: e.target.value || null })}
                className="input-glass px-3 py-2 text-sm w-full rounded-xl">
                <option value="" className="bg-[var(--surface)]">— Sem responsável —</option>
                {membros.map(m => <option key={m.id} value={m.id} className="bg-[var(--surface)]">{m.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Prioridade</label>
              <select value={tarefa.prioridade} onChange={e => atualizar({ prioridade: e.target.value })}
                className="input-glass px-3 py-2 text-sm w-full rounded-xl">
                {PRIORIDADES.map(p => <option key={p} value={p} className="bg-[var(--surface)]">{LABEL_PRIORIDADE[p]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Prazo</label>
              <input type="date" value={tarefa.prazo ? tarefa.prazo.slice(0, 10) : ''}
                onChange={e => atualizar({ prazo: e.target.value || null })}
                className="input-glass px-3 py-2 text-sm w-full rounded-xl" />
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              onBlur={() => descricao !== (tarefa.descricao || '') && atualizar({ descricao })}
              rows={3} placeholder="Sem descrição."
              className="input-glass px-3 py-2 text-sm w-full rounded-xl resize-none" />
          </div>

          <TagsPicker tarefaId={tarefaId} tagsAtuais={tarefa.tags} authHeaders={authHeaders} onChange={load} />

          <ChecklistSection tarefaId={tarefaId} itens={tarefa.checklist} authHeaders={authHeaders} onChange={alterarChecklist} />

          <ComentariosSection tarefaId={tarefaId} comentarios={tarefa.comentarios}
            userId={user?.id} isSupervisor={isSupervisor} authHeaders={authHeaders} onChange={load} />

          <AnexosSection tarefaId={tarefaId} anexos={tarefa.anexos}
            userId={user?.id} isSupervisor={isSupervisor} token={token} onChange={load} />

          <AtividadeFeed atividades={tarefa.atividades} />
        </div>
      </div>
    </div>
  )
}
