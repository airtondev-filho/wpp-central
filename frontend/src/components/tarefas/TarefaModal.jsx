import React, { useState } from 'react'
import { Modal } from '../ui/index.jsx'
import { PRIORIDADES } from './PrioridadeBadge.jsx'
import { useAuthStore } from '../../stores/index.js'

const LABEL_PRIORIDADE = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }

// Modal de criação rápida de tarefa. Para editar uma tarefa existente (checklist,
// comentários, anexos, histórico), veja TarefaDrawer.jsx.
export default function TarefaModal({ listaId, membros, onClose, onSaved }) {
  const { authHeaders } = useAuthStore()

  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'MEDIA', responsavelId: '', prazo: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const salvar = async () => {
    if (!form.titulo.trim()) { setErro('Título é obrigatório'); return }
    setSalvando(true)
    setErro('')
    try {
      const r = await fetch('/api/tarefas', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          listaId,
          titulo: form.titulo,
          descricao: form.descricao,
          prioridade: form.prioridade,
          responsavelId: form.responsavelId || null,
          prazo: form.prazo || null,
        }),
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Erro ao criar tarefa')
      onSaved?.()
      onClose()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal title="Nova tarefa" onClose={onClose} width="max-w-lg">
      <div className="flex flex-col gap-4">
        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl">
            {erro}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ink/40 uppercase tracking-wider">Título</label>
          <input value={form.titulo} onChange={set('titulo')} placeholder="Ex: Corrigir filtro de boletos"
            className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" autoFocus />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ink/40 uppercase tracking-wider">Descrição</label>
          <textarea value={form.descricao} onChange={set('descricao')} rows={3}
            placeholder="Detalhes da tarefa…"
            className="input-glass px-4 py-2.5 text-sm w-full rounded-xl resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Responsável</label>
            <select value={form.responsavelId} onChange={set('responsavelId')}
              className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
              <option value="" className="bg-[var(--surface)]">— Sem responsável —</option>
              {membros.map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--surface)]">{m.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Prioridade</label>
            <select value={form.prioridade} onChange={set('prioridade')}
              className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
              {PRIORIDADES.map(p => (
                <option key={p} value={p} className="bg-[var(--surface)]">{LABEL_PRIORIDADE[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ink/40 uppercase tracking-wider">Prazo</label>
          <input type="date" value={form.prazo} onChange={set('prazo')}
            className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" />
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50 hover:text-ink/80 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
