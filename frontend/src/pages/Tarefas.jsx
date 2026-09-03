import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faPlus, faStar, faUsers, faListCheck, faBoxArchive } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { Modal } from '../components/ui/index.jsx'

const ABAS = [
  { key: 'MEUS',       label: 'Meus quadros' },
  { key: 'FAVORITOS',  label: 'Favoritos' },
  { key: 'ARQUIVADOS', label: 'Arquivados' },
]

const CORES = ['#25d366', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899']

function QuadroCard({ quadro, onAbrir, onFavoritar, onArquivar }) {
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:bg-ink/[0.06] transition-colors"
      onClick={() => onAbrir(quadro.id)}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex-shrink-0" style={{ background: quadro.cor }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{quadro.nome}</div>
          {quadro.descricao && <div className="text-xs text-ink/40 truncate">{quadro.descricao}</div>}
        </div>
        <button onClick={e => { e.stopPropagation(); onFavoritar(quadro.id) }}
          className={`text-sm flex-shrink-0 ${quadro.favorito ? 'text-amber-400' : 'text-ink/20 hover:text-ink/50'}`}>
          <FontAwesomeIcon icon={faStar} />
        </button>
      </div>
      <div className="flex items-center gap-4 text-xs text-ink/40">
        <span><FontAwesomeIcon icon={faListCheck} className="mr-1" />{quadro.totalTarefas} tarefas</span>
        <span><FontAwesomeIcon icon={faUsers} className="mr-1" />{quadro._count?.membros} membros</span>
        <button onClick={e => { e.stopPropagation(); onArquivar(quadro.id) }}
          className="ml-auto hover:text-amber-400 transition-colors" title={quadro.arquivado ? 'Reativar' : 'Arquivar'}>
          <FontAwesomeIcon icon={faBoxArchive} />
        </button>
      </div>
    </div>
  )
}

export default function Tarefas() {
  const { authHeaders } = useAuthStore()
  const { refreshKey } = useOutletContext()
  const navigate = useNavigate()
  const [aba, setAba] = useState('MEUS')
  const [quadros, setQuadros] = useState([])
  const [novoOpen, setNovoOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', descricao: '', cor: CORES[0] })
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    const params = aba === 'FAVORITOS' ? '?favoritos=1' : aba === 'ARQUIVADOS' ? '?arquivados=1' : ''
    const r = await fetch(`/api/quadros${params}`, { headers: authHeaders() })
    setQuadros(r.ok ? await r.json() : [])
  }, [aba])

  useEffect(() => { load() }, [load, refreshKey])

  const criar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    const r = await fetch('/api/quadros', { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) })
    if (!r.ok) { setErro((await r.json()).error || 'Erro ao criar quadro'); return }
    const quadro = await r.json()
    setNovoOpen(false)
    setForm({ nome: '', descricao: '', cor: CORES[0] })
    setErro('')
    navigate(`/tarefas/${quadro.id}`)
  }

  const favoritar = async (id) => {
    await fetch(`/api/quadros/${id}/favorito`, { method: 'PATCH', headers: authHeaders() })
    load()
  }

  const arquivar = async (id) => {
    await fetch(`/api/quadros/${id}/arquivar`, { method: 'PATCH', headers: authHeaders() })
    load()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faClipboardList} className="text-accent" /> Tarefas</h1>
        <div className="flex gap-2 ml-4">
          {ABAS.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                aba === a.key ? 'bg-accent/15 text-accent border border-accent/30' : 'text-ink/40 hover:text-ink/70'
              }`}>{a.label}</button>
          ))}
        </div>
        <button onClick={() => setNovoOpen(true)}
          className="ml-auto px-4 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 transition-opacity">
          <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Novo quadro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {quadros.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <FontAwesomeIcon icon={faClipboardList} className="text-3xl text-ink/10" />
            <p className="text-sm text-ink/40">
              {aba === 'MEUS' ? 'Você ainda não possui nenhum quadro.' : 'Nenhum quadro encontrado nesta visão.'}
            </p>
            {aba === 'MEUS' && (
              <>
                <p className="text-xs text-ink/25">Organize suas tarefas criando seu primeiro quadro.</p>
                <button onClick={() => setNovoOpen(true)}
                  className="mt-2 px-4 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 transition-opacity">
                  <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Criar quadro
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {quadros.map(q => (
              <QuadroCard key={q.id} quadro={q}
                onAbrir={id => navigate(`/tarefas/${id}`)}
                onFavoritar={favoritar} onArquivar={arquivar} />
            ))}
          </div>
        )}
      </div>

      {novoOpen && (
        <Modal title="Novo quadro" onClose={() => setNovoOpen(false)}>
          <div className="flex flex-col gap-4">
            {erro && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl">{erro}</div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Suporte" autoFocus
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Opcional"
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Cor</label>
              <div className="flex gap-2">
                {CORES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))}
                    className="w-8 h-8 rounded-lg flex-shrink-0 transition-transform"
                    style={{ background: c, transform: form.cor === c ? 'scale(1.15)' : 'scale(1)', boxShadow: form.cor === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : 'none' }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setNovoOpen(false)} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50">Cancelar</button>
              <button onClick={criar} className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90">Criar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
