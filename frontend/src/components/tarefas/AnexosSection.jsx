import React, { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperclip, faTrash, faUpload, faCircleNotch } from '@fortawesome/free-solid-svg-icons'

function formatTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AnexosSection({ tarefaId, anexos, userId, isSupervisor, token, onChange }) {
  const fileRef = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const enviar = async (file) => {
    if (!file) return
    setEnviando(true)
    setErro('')
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const r = await fetch(`/api/tarefas/${tarefaId}/anexos`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Erro ao enviar anexo')
      onChange()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const excluir = async (anexoId) => {
    if (!confirm('Excluir este anexo?')) return
    await fetch(`/api/anexos/${anexoId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onChange()
  }

  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-xs text-ink/40 uppercase tracking-wider">Anexos</h4>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl">{erro}</div>}

      <div className="flex flex-col gap-1.5">
        {anexos.map(a => (
          <div key={a.id} className="glass rounded-xl px-3 py-2 flex items-center gap-2.5 group">
            <FontAwesomeIcon icon={faPaperclip} className="text-ink/30 flex-shrink-0" />
            <a href={a.url} target="_blank" rel="noopener noreferrer" download
              className="flex-1 min-w-0 text-sm text-ink/80 hover:text-accent truncate">{a.nome}</a>
            <span className="text-xs text-ink/30 flex-shrink-0">{formatTamanho(a.tamanho)}</span>
            <button onClick={() => excluir(a.id)}
              className="opacity-0 group-hover:opacity-100 text-ink/20 hover:text-red-400 transition-all flex-shrink-0">
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
            </button>
          </div>
        ))}
        {!anexos.length && <p className="text-xs text-ink/20">Nenhum anexo ainda.</p>}
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={e => enviar(e.target.files[0])} />
      <button onClick={() => fileRef.current?.click()} disabled={enviando}
        className="self-start px-3 py-1.5 text-xs border border-ink/10 rounded-lg text-ink/50 hover:text-ink hover:border-ink/20 transition-colors disabled:opacity-50">
        <FontAwesomeIcon icon={enviando ? faCircleNotch : faUpload} className={`mr-1.5 ${enviando ? 'animate-spin' : ''}`} />
        {enviando ? 'Enviando…' : 'Anexar arquivo'}
      </button>
    </div>
  )
}
