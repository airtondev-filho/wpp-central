import React, { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faPlus, faCalendarDays, faChalkboardUser, faVideo } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { useProximidadeInicio } from '../hooks/useProximidadeInicio.js'
import StatusTreinamentoBadge, { STATUS_TREINAMENTO } from '../components/treinamentos/StatusTreinamentoBadge.jsx'
import NovoTreinamentoModal from '../components/treinamentos/NovoTreinamentoModal.jsx'
import TreinamentoDrawer from '../components/treinamentos/TreinamentoDrawer.jsx'

const ABAS = [
  { key: 'TODOS', label: 'Todos' },
  ...STATUS_TREINAMENTO.map(s => ({ key: s, label: null })),
]
const LABEL_ABA = { TODOS: 'Todos', PLANEJADO: 'Planejados', AGENDADO: 'Agendados', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluídos', CANCELADO: 'Cancelados' }

function formatData(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} às ${hora}`
}

function TreinamentoCard({ t, onAbrir }) {
  const pct = t.totalParticipantes ? Math.round((t.concluidos / t.totalParticipantes) * 100) : 0
  const proximo = useProximidadeInicio(t)
  return (
    <div className={`glass rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:bg-ink/[0.06] transition-colors ${proximo ? 'card-treinamento-proximo' : ''}`} onClick={() => onAbrir(t.id)}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink truncate flex-1">{t.nome}</h3>
        <StatusTreinamentoBadge status={t.status} />
      </div>
      {t.descricao && <p className="text-xs text-ink/40 line-clamp-2">{t.descricao}</p>}
      <div className="flex items-center gap-4 text-xs text-ink/40">
        <span><FontAwesomeIcon icon={faChalkboardUser} className="mr-1" />{t.instrutor?.nome}</span>
        {t.data && <span><FontAwesomeIcon icon={faCalendarDays} className="mr-1" />{formatData(t.data)}</span>}
        {t.googleMeetLink && (
          <a href={t.googleMeetLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="ml-auto text-accent hover:underline">
            <FontAwesomeIcon icon={faVideo} className="mr-1" />Meet
          </a>
        )}
      </div>
      {t.totalParticipantes > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-ink/40 flex-shrink-0">{t.concluidos}/{t.totalParticipantes}</span>
        </div>
      )}
    </div>
  )
}

export default function Treinamentos() {
  const { authHeaders } = useAuthStore()
  const { refreshKey } = useOutletContext()
  const [aba, setAba] = useState('TODOS')
  const [treinamentos, setTreinamentos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [novoAberto, setNovoAberto] = useState(false)
  const [drawerId, setDrawerId] = useState(null)

  const load = useCallback(async () => {
    const params = aba === 'TODOS' ? '' : `?status=${aba}`
    const [t, u, g] = await Promise.all([
      fetch(`/api/treinamentos${params}`, { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/usuarios', { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch('/api/grupos', { headers: authHeaders() }).then(r => r.json()).catch(() => []),
    ])
    setTreinamentos(Array.isArray(t) ? t : [])
    setUsuarios(Array.isArray(u) ? u : [])
    setGrupos(Array.isArray(g) ? g : [])
  }, [aba])

  useEffect(() => { load() }, [load, refreshKey])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0 flex-wrap" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faGraduationCap} className="text-accent" /> Treinamentos</h1>
        <div className="flex gap-2 ml-4 flex-wrap">
          {ABAS.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                aba === a.key ? 'bg-accent/15 text-accent border border-accent/30' : 'text-ink/40 hover:text-ink/70'
              }`}>{LABEL_ABA[a.key]}</button>
          ))}
        </div>
        <button onClick={() => setNovoAberto(true)}
          className="ml-auto px-4 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 transition-opacity">
          <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Novo treinamento
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {treinamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <FontAwesomeIcon icon={faGraduationCap} className="text-3xl text-ink/10" />
            <p className="text-sm text-ink/40">Nenhum treinamento encontrado.</p>
            <p className="text-xs text-ink/25">Organize a capacitação da equipe criando um treinamento.</p>
            <button onClick={() => setNovoAberto(true)}
              className="mt-2 px-4 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 transition-opacity">
              <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Criar treinamento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {treinamentos.map(t => <TreinamentoCard key={t.id} t={t} onAbrir={setDrawerId} />)}
          </div>
        )}
      </div>

      {novoAberto && (
        <NovoTreinamentoModal usuarios={usuarios} grupos={grupos} onClose={() => setNovoAberto(false)}
          onCriado={(t) => { setNovoAberto(false); load(); setDrawerId(t.id) }} />
      )}

      {drawerId && (
        <TreinamentoDrawer treinamentoId={drawerId} usuarios={usuarios} grupos={grupos}
          onClose={() => setDrawerId(null)} onChanged={load} />
      )}
    </div>
  )
}
