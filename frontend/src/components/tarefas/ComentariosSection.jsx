import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'

function formatDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Comentario({ comentario, userId, isSupervisor, authHeaders, onChange }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(comentario.texto)
  const podeGerenciar = comentario.autor.id === userId || isSupervisor

  const salvar = async () => {
    if (!texto.trim()) return
    await fetch(`/api/comentarios/${comentario.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ texto }) })
    setEditando(false)
    onChange()
  }

  const excluir = async () => {
    if (!confirm('Excluir este comentário?')) return
    await fetch(`/api/comentarios/${comentario.id}`, { method: 'DELETE', headers: authHeaders() })
    onChange()
  }

  return (
    <div className="glass rounded-xl p-3 flex flex-col gap-1.5 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink/70">{comentario.autor.nome}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/25">{formatDataHora(comentario.criadoEm)}{comentario.editadoEm && ' (editado)'}</span>
          {podeGerenciar && !editando && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
              <button onClick={() => setEditando(true)} className="text-ink/30 hover:text-ink/60"><FontAwesomeIcon icon={faPen} className="text-[10px]" /></button>
              <button onClick={excluir} className="text-ink/30 hover:text-red-400"><FontAwesomeIcon icon={faTrash} className="text-[10px]" /></button>
            </div>
          )}
        </div>
      </div>

      {editando ? (
        <div className="flex flex-col gap-2">
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
            className="input-glass px-3 py-2 text-sm w-full rounded-lg resize-none" autoFocus />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditando(false); setTexto(comentario.texto) }} className="text-xs text-ink/40 hover:text-ink/70">Cancelar</button>
            <button onClick={salvar} className="text-xs px-3 py-1 bg-accent text-black font-semibold rounded-lg hover:opacity-90">Salvar</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/80 whitespace-pre-wrap">{comentario.texto}</p>
      )}
    </div>
  )
}

export default function ComentariosSection({ tarefaId, comentarios, userId, isSupervisor, authHeaders, onChange }) {
  const [texto, setTexto] = useState('')

  const enviar = async () => {
    if (!texto.trim()) return
    await fetch(`/api/tarefas/${tarefaId}/comentarios`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ texto }) })
    setTexto('')
    onChange()
  }

  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-xs text-ink/40 uppercase tracking-wider">Comentários</h4>

      <div className="flex flex-col gap-2">
        {comentarios.map(c => (
          <Comentario key={c.id} comentario={c} userId={userId} isSupervisor={isSupervisor} authHeaders={authHeaders} onChange={onChange} />
        ))}
        {!comentarios.length && <p className="text-xs text-ink/20">Nenhum comentário ainda.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
          placeholder="Escreva um comentário…"
          className="input-glass px-3 py-2 text-sm w-full rounded-lg resize-none" />
        <button onClick={enviar} className="self-end px-4 py-1.5 text-xs bg-accent text-black font-semibold rounded-lg hover:opacity-90">
          Comentar
        </button>
      </div>
    </div>
  )
}
