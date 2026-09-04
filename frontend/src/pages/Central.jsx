import React, { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHeadset, faMagnifyingGlass, faArrowsRotate, faTriangleExclamation, faCircleCheck,
  faClock, faRightLeft, faCheck, faRotateLeft, faGraduationCap, faChalkboardUser,
  faListCheck, faUser, faLayerGroup
} from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { Moldura } from '../components/ui/index.jsx'
import StatusTreinamentoBadge from '../components/treinamentos/StatusTreinamentoBadge.jsx'
import TreinamentoDrawer from '../components/treinamentos/TreinamentoDrawer.jsx'
import PrioridadeBadge from '../components/tarefas/PrioridadeBadge.jsx'
import TarefaDrawer from '../components/tarefas/TarefaDrawer.jsx'
import { useProximidadeInicio } from '../hooks/useProximidadeInicio.js'

const COLS = [
  { key: 'CRITICO', label: 'Crítica', icon: faArrowsRotate,
    headerCls: 'bg-violet-600/25 border border-violet-500/40 text-violet-200',
    badgeCls:  'bg-violet-500 text-white' },
  { key: 'ALTO',    label: 'Alta',    icon: faTriangleExclamation,
    headerCls: 'bg-violet-600/12 border border-violet-500/25 text-violet-300',
    badgeCls:  'bg-violet-500/60 text-white' },
  { key: 'NORMAL',  label: 'Normal',  icon: faCircleCheck,
    headerCls: 'bg-violet-600/5 border border-violet-500/15 text-violet-300/70',
    badgeCls:  'bg-ink/10 text-ink/60' },
]

const BORDER = {
  CRITICO: '#ef4444',
  ALTO:    '#f59e0b',
  NORMAL:  '#3b82f6',
}

function formatAguardando(minutos) {
  if (minutos == null || minutos < 0) return '—'
  if (minutos < 60) return `${minutos}min`
  const h = Math.floor(minutos / 60), m = minutos % 60
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`
  return `${Math.floor(h / 24)}d`
}

function TreinamentoHojeCard({ t, onAbrir }) {
  const proximo = useProximidadeInicio(t)
  return (
    <button onClick={onAbrir}
      className={`glass rounded-xl p-4 flex flex-col gap-2 text-left hover:bg-ink/[0.06] transition-colors ${proximo ? 'card-treinamento-proximo' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-semibold text-ink truncate">{t.nome}</span>
        <span className="text-sm font-bold text-violet-300 flex-shrink-0">
          {new Date(t.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <StatusTreinamentoBadge status={t.status} className="self-start" />
      <span className="text-xs text-ink/40"><FontAwesomeIcon icon={faChalkboardUser} className="mr-1.5" />{t.instrutor?.nome}</span>
    </button>
  )
}

function AtendCard({ a, agentes, podeRedirecionar, onFinalizar, onAtribuir, onRedirecionar, onReabrir, onAbrirChat }) {
  const finalizado        = a.status === 'FINALIZADO'
  const respondidoRecente = !finalizado && a.ehMinha
  const atrasado          = !finalizado && !a.ehMinha
  const semAgente         = !finalizado && !a.agenteId
  const redirecionadoPendente = !finalizado && a.redirecionadoPendente

  return (
    <div onClick={() => onAbrirChat(a.id)}
      className="relative glass rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer hover:brightness-110 transition-all"
      style={{ border: `1.5px solid ${BORDER[a.prioridade] || BORDER.NORMAL}` }}>
      {/* Ação rápida (finalizar/reabrir) */}
      <button
        onClick={e => { e.stopPropagation(); finalizado ? onReabrir(a.id) : onFinalizar(a.id) }}
        title={finalizado ? 'Reabrir' : 'Finalizar'}
        className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
          finalizado ? 'text-ink/40 hover:text-violet-300 hover:bg-violet-500/10' : 'text-ink/20 hover:text-violet-300 hover:bg-violet-500/10'
        }`}>
        <FontAwesomeIcon icon={finalizado ? faRotateLeft : faCheck} />
      </button>

      <div className="flex items-center gap-2 pr-6">
        {a.grupo?.logo && (
          <img src={a.grupo.logo} alt={a.grupo.nome} className="w-6 h-6 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="text-lg font-semibold text-ink truncate">{a.grupo?.nome}</div>
      </div>

      {/* Badges (somente ícones) */}
      <div className="flex items-center gap-2 flex-wrap">
        {atrasado && (
          <span title="Atendimento atrasado"
            className="inline-flex items-center justify-center w-6 h-6 bg-ink/10 text-ink/80 text-xs rounded-full">
            <FontAwesomeIcon icon={faClock} />
          </span>
        )}
        {semAgente && (
          <span title="Grupo sem agente responsável"
            className="inline-flex items-center justify-center w-6 h-6 bg-ink/10 text-ink/80 text-xs rounded-full">
            <FontAwesomeIcon icon={faRightLeft} />
          </span>
        )}
        {redirecionadoPendente && (
          <span title="Redirecionado — aguardando resposta do agente"
            className="inline-flex items-center justify-center w-6 h-6 bg-violet-500/20 text-violet-300 text-xs rounded-full">
            <FontAwesomeIcon icon={faRightLeft} />
          </span>
        )}
        {respondidoRecente && (
          <span title="Respondido recentemente"
            className="inline-flex items-center justify-center w-6 h-6 bg-ink/5 text-ink/40 text-xs rounded-full">
            <FontAwesomeIcon icon={faCircleCheck} />
          </span>
        )}
        {finalizado && (
          <span title="Finalizado"
            className="inline-flex items-center justify-center w-6 h-6 bg-ink/5 text-ink/40 text-xs rounded-full">
            <FontAwesomeIcon icon={faCircleCheck} />
          </span>
        )}
      </div>

      {/* Última mensagem */}
      <div className="text-sm text-ink/40 leading-snug line-clamp-2">
        Última mensagem: <span className="text-ink/80 font-medium">{a.ultimaMsg || '(sem mensagens)'}</span>
      </div>

      <div className="border-t border-ink/10 my-0.5" />

      {/* Meta */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="text-ink/40">Enviada por: <span className="text-ink/80 font-medium">{a.ultimoRemetente || '—'}</span></div>
        <div className="flex items-center gap-2">
          {finalizado
            ? <span className="text-ink/80 font-medium">{a.agente?.nome || '—'}</span>
            : <select
                value={a.agenteId || ''}
                onClick={e => e.stopPropagation()}
                onChange={e => onAtribuir(a.id, e.target.value)}
                className="text-ink/80 font-medium bg-transparent border-none outline-none -ml-1 cursor-pointer">
                <option value="" className="bg-[var(--surface)]">—</option>
                {agentes.map(ag => <option key={ag.id} value={ag.id} className="bg-[var(--surface)]">{ag.nome}</option>)}
              </select>
          }
          {podeRedirecionar && !finalizado && (
            <select
              value=""
              onClick={e => e.stopPropagation()}
              onChange={e => { if (e.target.value) onRedirecionar(a.id, e.target.value); e.target.value = '' }}
              title="Redirecionar para um agente (com prazo e pontuação)"
              className="text-violet-300 text-xs font-medium bg-violet-500/10 border border-violet-500/20 rounded-md px-1.5 py-0.5 outline-none cursor-pointer">
              <option value="" className="bg-[var(--surface)]">Redirecionar…</option>
              {agentes.map(ag => <option key={ag.id} value={ag.id} className="bg-[var(--surface)]">{ag.nome}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-ink/50 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faClock} className="text-violet-400" />
            Aguardando há: <span className="text-violet-400 font-bold text-base">{formatAguardando(a.minutosAberto)}</span>
          </div>
          <Moldura slug={a.agente?.molduraEquipada} size={52}>
            <div className="w-[52px] h-[52px] rounded-full bg-violet-500/20 flex items-center justify-center text-lg font-bold text-violet-200 flex-shrink-0 overflow-hidden">
              {a.agente?.avatar
                ? <img src={a.agente.avatar} alt={a.agente.nome} className="w-full h-full object-cover" />
                : (a.agente?.nome || '?').charAt(0).toUpperCase()}
            </div>
          </Moldura>
        </div>
      </div>
    </div>
  )
}

export default function Central() {
  const { authHeaders, user } = useAuthStore()
  const { refreshKey } = useOutletContext()
  const navigate = useNavigate()
  const [atends, setAtends]   = useState([])
  const [agentes, setAgentes] = useState([])
  const [filtro, setFiltro]   = useState('ABERTOS')
  const [busca, setBusca]     = useState('')
  const [treinamentosHoje, setTreinamentosHoje] = useState([])
  const [tarefasHoje, setTarefasHoje] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [drawerTreinamentoId, setDrawerTreinamentoId] = useState(null)
  const [drawerTarefaId, setDrawerTarefaId] = useState(null)

  const load = useCallback(async () => {
    const statusParam = filtro === 'ABERTOS'    ? 'ABERTO,EM_ATENDIMENTO,AGUARDANDO_CLIENTE'
                      : filtro === 'FINALIZADOS' ? 'FINALIZADO'
                      : 'ABERTO,EM_ATENDIMENTO,AGUARDANDO_CLIENTE,FINALIZADO'

    const [a, ag, tr, ta, us] = await Promise.all([
      fetch(`/api/atendimentos?status=${statusParam}`, { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/agentes', { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch('/api/treinamentos?hoje=1', { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch('/api/tarefas?hoje=1', { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch('/api/usuarios', { headers: authHeaders() }).then(r => r.json()).catch(() => []),
    ])
    setAtends(Array.isArray(a) ? a : [])
    setAgentes(Array.isArray(ag) ? ag : [])
    setTreinamentosHoje(Array.isArray(tr) ? tr : [])
    setTarefasHoje(Array.isArray(ta) ? ta : [])
    setUsuarios(Array.isArray(us) ? us : [])
  }, [filtro])

  useEffect(() => { load() }, [load, refreshKey])

  useEffect(() => {
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  const finalizar = async (id) => {
    await fetch(`/api/atendimentos/${id}/finalizar`, { method: 'POST', headers: authHeaders() })
    load()
  }

  const reabrir = async (id) => {
    await fetch(`/api/atendimentos/${id}/reabrir`, { method: 'POST', headers: authHeaders() })
    load()
  }

  const atribuir = async (id, agenteId) => {
    await fetch(`/api/atendimentos/${id}/agente`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ agenteId: agenteId ? Number(agenteId) : null })
    })
    load()
  }

  const redirecionar = async (id, agenteId) => {
    await fetch(`/api/atendimentos/${id}/redirecionar`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ agenteId: Number(agenteId) })
    })
    load()
  }

  const podeRedirecionar = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'

  const filtered = busca
    ? atends.filter(a => a.grupo?.nome?.toLowerCase().includes(busca.toLowerCase()))
    : atends

  const porPrioridade = (p) => filtered.filter(a =>
    a.prioridade === p && a.status !== 'FINALIZADO' && (filtro !== 'ABERTOS' || !a.ehMinha)
  )
  const finalizados   = filtered.filter(a => a.status === 'FINALIZADO')

  const totalAbertos = atends.filter(a => a.status !== 'FINALIZADO' && !a.ehMinha).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <div>
          <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faHeadset} className="text-violet-400" /> Central de Atenção</h1>
          <p className="text-xs text-ink/40">{totalAbertos} atendimentos precisando de atenção</p>
        </div>
        <div className="flex gap-2 ml-auto items-center">
          <div className="relative">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 text-xs" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar grupo…"
              className="input-glass pl-9 pr-4 py-2 text-sm rounded-xl w-56" />
          </div>
          {['ABERTOS', 'TODOS', 'FINALIZADOS'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filtro === f ? 'bg-violet-500/15 text-violet-200 border border-violet-500/30' : 'text-ink/40 hover:text-ink/70'
              }`}>{f.charAt(0) + f.slice(1).toLowerCase()}</button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full min-w-max">
          {COLS.map(col => {
            const items = porPrioridade(col.key)
            return (
              <div key={col.key} className="w-80 flex-shrink-0 flex flex-col gap-3">
                <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${col.headerCls}`}>
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={col.icon} className="text-xs" /> {col.label}
                  </span>
                  <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${col.badgeCls}`}>
                    {items.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                  {items.map(a => (
                    <AtendCard key={a.id} a={a} agentes={agentes} podeRedirecionar={podeRedirecionar}
                      onFinalizar={finalizar} onAtribuir={atribuir} onRedirecionar={redirecionar} onReabrir={reabrir} onAbrirChat={id => navigate(`/conversar/${id}`)} />
                  ))}
                  {!items.length && (
                    <div className="text-center py-8 text-ink/20 text-xs">Nenhum atendimento</div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Coluna Finalizados */}
          {filtro !== 'ABERTOS' && (
            <div className="w-80 flex-shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-ink/5 border border-ink/10 text-ink/60">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-xs" /> Finalizados
                </span>
                <span className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full bg-ink/10 text-ink/60">
                  {finalizados.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {finalizados.map(a => (
                  <AtendCard key={a.id} a={a} agentes={agentes} podeRedirecionar={podeRedirecionar}
                    onFinalizar={finalizar} onAtribuir={atribuir} onRedirecionar={redirecionar} onReabrir={reabrir} onAbrirChat={id => navigate(`/conversar/${id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* Treinamentos de hoje */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-ink/5 border border-ink/10 text-ink/60">
              <span className="text-sm font-semibold flex items-center gap-2">
                <FontAwesomeIcon icon={faGraduationCap} className="text-xs" /> Treinamentos de hoje
              </span>
              <span className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full bg-ink/10 text-ink/60">
                {treinamentosHoje.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {treinamentosHoje.map(t => (
                <TreinamentoHojeCard key={t.id} t={t} onAbrir={() => setDrawerTreinamentoId(t.id)} />
              ))}
              {!treinamentosHoje.length && (
                <div className="text-center py-8 text-ink/20 text-xs">Nenhum treinamento para hoje</div>
              )}
            </div>
          </div>

          {/* Tarefas de hoje */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-ink/5 border border-ink/10 text-ink/60">
              <span className="text-sm font-semibold flex items-center gap-2">
                <FontAwesomeIcon icon={faListCheck} className="text-xs" /> Tarefas de hoje
              </span>
              <span className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full bg-ink/10 text-ink/60">
                {tarefasHoje.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {tarefasHoje.map(t => (
                <button key={t.id} onClick={() => setDrawerTarefaId(t.id)}
                  className="glass rounded-xl p-4 flex flex-col gap-2 text-left hover:bg-ink/[0.06] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[15px] font-semibold text-ink truncate">{t.titulo}</span>
                  </div>
                  <PrioridadeBadge prioridade={t.prioridade} className="self-start" />
                  <span className="text-xs text-ink/40 truncate">
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-1.5" />{t.lista?.quadro?.nome} · {t.lista?.nome}
                  </span>
                  {t.responsavel && (
                    <span className="text-xs text-ink/40">
                      <FontAwesomeIcon icon={faUser} className="mr-1.5" />{t.responsavel.nome}
                    </span>
                  )}
                </button>
              ))}
              {!tarefasHoje.length && (
                <div className="text-center py-8 text-ink/20 text-xs">Nenhuma tarefa para hoje</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {drawerTreinamentoId && (
        <TreinamentoDrawer treinamentoId={drawerTreinamentoId} usuarios={usuarios}
          onClose={() => setDrawerTreinamentoId(null)} onChanged={load} />
      )}

      {drawerTarefaId && (
        <TarefaDrawer tarefaId={drawerTarefaId} membros={usuarios}
          onClose={() => setDrawerTarefaId(null)} onChanged={load} />
      )}
    </div>
  )
}
