import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faComments, faRightLeft } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { getSocket } from '../hooks/useSocket.js'
import { StatusBadge, PriorBadge } from '../components/ui/index.jsx'

export default function Conversar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { authHeaders, user } = useAuthStore()
  const [atend, setAtend] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    setAtend(null)
    setErro('')

    const carregar = () => fetch(`/api/atendimentos/${id}`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error('Atendimento não encontrado'); return r.json() })
      .then(d => { if (ativo) setAtend(d) })
      .catch(err => { if (ativo) setErro(err.message) })
    carregar()

    const socket = getSocket()
    const onUpdate = (payload) => { if (!payload?.atendId || String(payload.atendId) === id) carregar() }
    socket?.on('atendimento_updated', onUpdate)

    return () => { ativo = false; socket?.off('atendimento_updated', onUpdate) }
  }, [id])

  const souResponsavel = atend?.agenteId === user?.id
  const pendente = atend?.redirecionadoPendente && souResponsavel

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors flex-shrink-0">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        {atend?.grupo?.logo && (
          <img src={atend.grupo.logo} alt={atend.grupo.nome} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-ink truncate"><FontAwesomeIcon icon={faComments} className="text-accent"/> {atend?.grupo?.nome || 'Conversa'}</h1>
          {atend && (
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge s={atend.status} />
              <PriorBadge p={atend.prioridade} />
            </div>
          )}
        </div>
      </div>

      {pendente && (
        <div className="mx-6 mt-4 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs rounded-xl p-3 flex items-center gap-2 flex-shrink-0">
          <FontAwesomeIcon icon={faRightLeft} />
          Este atendimento foi redirecionado para você. Responda pelo WhatsApp para registrar sua resposta e ganhar os pontos do bônus.
        </div>
      )}

      {erro && (
        <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 flex-shrink-0">{erro}</div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-3 max-w-2xl mx-auto">
          {!atend && !erro && <div className="text-center text-ink/30 text-sm py-8">Carregando…</div>}
          {atend && !atend.mensagens?.length && (
            <div className="text-center text-ink/30 text-sm py-8">Nenhuma mensagem</div>
          )}
          {atend?.mensagens?.map(m => (
            <div key={m.id} className={`flex items-end gap-2 max-w-[80%] ${m.ehAgente ? 'self-end flex-row-reverse' : 'self-start'}`}>
              {m.ehAgente && (
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent flex-shrink-0 overflow-hidden">
                  {m.agente?.avatar
                    ? <img src={m.agente.avatar} alt={m.agente.nome} className="w-full h-full object-cover" />
                    : (m.agente?.nome || 'V').charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`flex flex-col ${m.ehAgente ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.ehAgente ? 'bg-accent/20 text-ink/90 rounded-br-sm' : 'bg-ink/10 text-ink/90 rounded-bl-sm'
                }`}>
                  {m.texto || `(${m.tipo})`}
                </div>
                <span className="text-[10px] text-ink/30 mt-1 px-1">
                  {m.ehAgente ? (m.agente?.nome || 'Você') : 'Cliente'} · {new Date(m.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
