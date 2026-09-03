import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPlus, faTag } from '@fortawesome/free-solid-svg-icons'

const CORES = ['#25d366', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899']

export default function TagsPicker({ tarefaId, tagsAtuais, authHeaders, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [todasTags, setTodasTags] = useState([])
  const [novoNome, setNovoNome] = useState('')
  const [novaCor, setNovaCor] = useState(CORES[0])

  useEffect(() => {
    if (aberto) fetch('/api/tags', { headers: authHeaders() }).then(r => r.json()).then(setTodasTags)
  }, [aberto])

  const idsAtuais = new Set(tagsAtuais.map(t => t.id))

  const adicionar = async (tagId) => {
    await fetch(`/api/tarefas/${tarefaId}/tags`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ tagId }) })
    onChange()
  }

  const remover = async (tagId) => {
    await fetch(`/api/tarefas/${tarefaId}/tags/${tagId}`, { method: 'DELETE', headers: authHeaders() })
    onChange()
  }

  const criarECaptar = async () => {
    if (!novoNome.trim()) return
    const r = await fetch('/api/tags', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ nome: novoNome, cor: novaCor }) })
    const tag = await r.json()
    setNovoNome('')
    setTodasTags(prev => prev.some(t => t.id === tag.id) ? prev : [...prev, tag])
    await adicionar(tag.id)
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs text-ink/40 uppercase tracking-wider">Tags</h4>
      <div className="flex items-center gap-1.5 flex-wrap">
        {tagsAtuais.map(t => (
          <span key={t.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ color: t.cor, background: `${t.cor}1a`, border: `1px solid ${t.cor}33` }}>
            {t.nome}
            <button onClick={() => remover(t.id)} className="hover:opacity-70"><FontAwesomeIcon icon={faXmark} /></button>
          </span>
        ))}
        <div className="relative">
          <button onClick={() => setAberto(o => !o)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-ink/30 hover:text-ink/60 border border-ink/10 hover:border-ink/20 transition-colors">
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
          </button>
          {aberto && (
            <div className="absolute z-10 top-8 left-0 glass-strong rounded-xl p-3 w-56 flex flex-col gap-2 shadow-glass">
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {todasTags.filter(t => !idsAtuais.has(t.id)).map(t => (
                  <button key={t.id} onClick={() => adicionar(t.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink/5 text-left text-xs text-ink/70">
                    <FontAwesomeIcon icon={faTag} style={{ color: t.cor }} />
                    {t.nome}
                  </button>
                ))}
                {!todasTags.filter(t => !idsAtuais.has(t.id)).length && (
                  <p className="text-xs text-ink/20 px-2 py-1">Nenhuma tag disponível</p>
                )}
              </div>
              <div className="border-t border-ink/10 pt-2 flex flex-col gap-2">
                <input value={novoNome} onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && criarECaptar()}
                  placeholder="Nova tag…" className="input-glass px-2.5 py-1.5 text-xs w-full rounded-lg" />
                <div className="flex items-center gap-1.5">
                  {CORES.map(c => (
                    <button key={c} onClick={() => setNovaCor(c)} className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: c, boxShadow: novaCor === c ? `0 0 0 2px var(--bg), 0 0 0 3px ${c}` : 'none' }} />
                  ))}
                  <button onClick={criarECaptar} className="ml-auto px-2.5 py-1 text-xs bg-accent text-black font-semibold rounded-lg hover:opacity-90">
                    Criar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
