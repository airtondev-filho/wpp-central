import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faUserPlus, faXmark } from '@fortawesome/free-solid-svg-icons'

export default function MembrosPopover({ quadroId, membros, criadorId, authHeaders, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [selecionado, setSelecionado] = useState('')

  useEffect(() => {
    if (aberto) fetch('/api/usuarios', { headers: authHeaders() }).then(r => r.json()).then(setUsuarios)
  }, [aberto])

  const idsAtuais = new Set(membros.map(m => m.id))
  const disponiveis = usuarios.filter(u => !idsAtuais.has(u.id))

  const adicionar = async () => {
    if (!selecionado) return
    await fetch(`/api/quadros/${quadroId}/membros`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ userId: selecionado }),
    })
    setSelecionado('')
    onChange()
  }

  const remover = async (userId) => {
    await fetch(`/api/quadros/${quadroId}/membros/${userId}`, { method: 'DELETE', headers: authHeaders() })
    onChange()
  }

  return (
    <div className="relative">
      <button onClick={() => setAberto(o => !o)}
        className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70 transition-colors">
        <FontAwesomeIcon icon={faUsers} /> {membros.map(m => m.nome).join(', ')}
      </button>
      {aberto && (
        <div className="absolute z-10 top-7 right-0 glass-strong rounded-xl p-3 w-64 flex flex-col gap-2 shadow-glass" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {membros.map(m => (
              <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-ink/5 text-xs text-ink/70">
                <span>{m.nome}{m.id === criadorId && <span className="text-ink/30 ml-1">(criador)</span>}</span>
                {m.id !== criadorId && (
                  <button onClick={() => remover(m.id)} className="text-ink/20 hover:text-red-400">
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-ink/10 pt-2 flex gap-2">
            <select value={selecionado} onChange={e => setSelecionado(e.target.value)}
              className="input-glass px-2.5 py-1.5 text-xs w-full rounded-lg">
              <option value="" className="bg-[var(--surface)]">Adicionar membro…</option>
              {disponiveis.map(u => <option key={u.id} value={u.id} className="bg-[var(--surface)]">{u.nome}</option>)}
            </select>
            <button onClick={adicionar} className="px-2.5 py-1 text-xs bg-accent text-black font-semibold rounded-lg hover:opacity-90 flex-shrink-0">
              <FontAwesomeIcon icon={faUserPlus} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
