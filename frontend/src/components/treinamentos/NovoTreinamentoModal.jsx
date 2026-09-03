import React, { useState } from 'react'
import { Modal } from '../ui/index.jsx'
import { useAuthStore } from '../../stores/index.js'

export default function NovoTreinamentoModal({ usuarios, grupos = [], onClose, onCriado }) {
  const { authHeaders, user } = useAuthStore()
  const [form, setForm] = useState({ nome: '', descricao: '', instrutorId: user?.id || '', grupoJid: '', data: '', duracaoMin: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    setSalvando(true)
    setErro('')
    try {
      const r = await fetch('/api/treinamentos', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...form, instrutorId: form.instrutorId || null, grupoJid: form.grupoJid || null, duracaoMin: form.duracaoMin || null, data: form.data || null }),
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Erro ao criar treinamento')
      const treinamento = await r.json()
      onCriado(treinamento)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal title="Novo treinamento" onClose={onClose} width="max-w-lg">
      <div className="flex flex-col gap-4">
        {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl">{erro}</div>}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ink/40 uppercase tracking-wider">Nome</label>
          <input value={form.nome} onChange={set('nome')} placeholder="Ex: Atendimento ao cliente" autoFocus
            className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ink/40 uppercase tracking-wider">Descrição</label>
          <textarea value={form.descricao} onChange={set('descricao')} rows={2} placeholder="Do que se trata este treinamento…"
            className="input-glass px-4 py-2.5 text-sm w-full rounded-xl resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Instrutor</label>
            <select value={form.instrutorId} onChange={set('instrutorId')}
              className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
              {usuarios.map(u => <option key={u.id} value={u.id} className="bg-[var(--surface)]">{u.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Duração (min)</label>
            <input type="number" min="0" value={form.duracaoMin} onChange={set('duracaoMin')} placeholder="60"
              className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ink/40 uppercase tracking-wider">Grupo (opcional)</label>
          <select value={form.grupoJid} onChange={set('grupoJid')}
            className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
            <option value="" className="bg-[var(--surface)]">Nenhum</option>
            {grupos.map(g => <option key={g.jid} value={g.jid} className="bg-[var(--surface)]">{g.nome}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ink/40 uppercase tracking-wider">Data e horário</label>
          <input type="datetime-local" value={form.data} onChange={set('data')}
            className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" />
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50 hover:text-ink/80 transition-colors">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
