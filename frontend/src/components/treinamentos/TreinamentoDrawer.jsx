import React, { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTrash, faPlus, faLink, faUserPlus, faVideo } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../../stores/index.js'
import StatusTreinamentoBadge, { STATUS_TREINAMENTO } from './StatusTreinamentoBadge.jsx'
import ParticipanteStatus, { STATUS_PARTICIPANTE } from './ParticipanteStatus.jsx'

const LABEL_STATUS = { PLANEJADO: 'Planejado', AGENDADO: 'Agendado', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' }
const LABEL_PARTICIPANTE = { NAO_INICIADO: 'Não iniciado', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído' }

// converte um ISO para o formato local "YYYY-MM-DDTHH:mm" esperado por <input type="datetime-local">
function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TreinamentoDrawer({ treinamentoId, usuarios, grupos = [], onClose, onChanged }) {
  const { authHeaders, user } = useAuthStore()
  const [treinamento, setTreinamento] = useState(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [novoMaterial, setNovoMaterial] = useState('')
  const [novoParticipanteId, setNovoParticipanteId] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/treinamentos/${treinamentoId}`, { headers: authHeaders() })
    if (!r.ok) return
    const data = await r.json()
    setTreinamento(data)
    setNome(data.nome)
    setDescricao(data.descricao || '')
    setConteudo(data.conteudo || '')
    setObservacoes(data.observacoes || '')
  }, [treinamentoId])

  useEffect(() => { load() }, [load])

  if (!treinamento) {
    return (
      <div className="overlay-backdrop fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.7)', '--overlay-blur': '6px' }}>
        <div className="glass-strong h-full w-full max-w-lg flex items-center justify-center text-ink/30 text-sm">Carregando…</div>
      </div>
    )
  }

  const podeGerenciar = treinamento.instrutorId === user?.id || ['ADMIN', 'SUPERVISOR'].includes(user?.role)

  const atualizar = async (patch) => {
    await fetch(`/api/treinamentos/${treinamentoId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(patch) })
    await load()
    onChanged?.()
  }

  const excluir = async () => {
    if (!confirm('Excluir este treinamento? Essa ação não pode ser desfeita.')) return
    await fetch(`/api/treinamentos/${treinamentoId}`, { method: 'DELETE', headers: authHeaders() })
    onChanged?.()
    onClose()
  }

  const adicionarMaterial = () => {
    if (!novoMaterial.trim()) return
    atualizar({ materiais: [...treinamento.materiais, novoMaterial.trim()] })
    setNovoMaterial('')
  }

  const removerMaterial = (idx) => {
    atualizar({ materiais: treinamento.materiais.filter((_, i) => i !== idx) })
  }

  const adicionarParticipante = async () => {
    if (!novoParticipanteId) return
    await fetch(`/api/treinamentos/${treinamentoId}/participantes`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ userId: novoParticipanteId }),
    })
    setNovoParticipanteId('')
    load(); onChanged?.()
  }

  const removerParticipante = async (userId) => {
    await fetch(`/api/treinamentos/${treinamentoId}/participantes/${userId}`, { method: 'DELETE', headers: authHeaders() })
    load(); onChanged?.()
  }

  const atualizarStatusParticipante = async (userId, status) => {
    await fetch(`/api/treinamentos/${treinamentoId}/participantes/${userId}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
    })
    load(); onChanged?.()
  }

  const participantesDisponiveis = usuarios.filter(u => !treinamento.participantes.some(p => p.userId === u.id))
  const totalParticipantes = treinamento.participantes.length
  const concluidos = treinamento.participantes.filter(p => p.status === 'CONCLUIDO').length
  const pct = totalParticipantes ? Math.round((concluidos / totalParticipantes) * 100) : 0

  return (
    <div className="overlay-backdrop fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.7)', '--overlay-blur': '6px' }}
      onClick={onClose}>
      <div className="glass-strong h-full w-full max-w-lg flex flex-col shadow-glass" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 8%)' }}>
          {podeGerenciar ? (
            <input value={nome} onChange={e => setNome(e.target.value)}
              onBlur={() => nome.trim() && nome !== treinamento.nome && atualizar({ nome })}
              className="flex-1 bg-transparent text-base font-bold text-ink outline-none border-b border-transparent focus:border-ink/20 pb-1" />
          ) : (
            <h3 className="flex-1 text-base font-bold text-ink">{treinamento.nome}</h3>
          )}
          <button onClick={onClose} className="text-ink/30 hover:text-ink text-lg leading-none flex-shrink-0">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Status + excluir */}
          <div className="flex items-center gap-2">
            {podeGerenciar ? (
              <select value={treinamento.status} onChange={e => atualizar({ status: e.target.value })}
                className="input-glass px-3 py-1.5 text-xs rounded-lg">
                {STATUS_TREINAMENTO.map(s => <option key={s} value={s} className="bg-[var(--surface)]">{LABEL_STATUS[s]}</option>)}
              </select>
            ) : (
              <StatusTreinamentoBadge status={treinamento.status} />
            )}
            {podeGerenciar && (
              <button onClick={excluir} className="ml-auto px-3 py-1.5 text-xs text-ink/30 hover:text-red-400 transition-colors">
                <FontAwesomeIcon icon={faTrash} className="mr-1.5" /> Excluir
              </button>
            )}
          </div>

          {/* Videochamada */}
          {treinamento.googleMeetLink && (
            <a href={treinamento.googleMeetLink} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-black bg-accent rounded-xl hover:opacity-90 transition-opacity">
              <FontAwesomeIcon icon={faVideo} /> Entrar no Google Meet
            </a>
          )}

          {/* Campos principais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Instrutor</label>
              {podeGerenciar ? (
                <select value={treinamento.instrutorId} onChange={e => atualizar({ instrutorId: e.target.value })}
                  className="input-glass px-3 py-2 text-sm w-full rounded-xl">
                  {usuarios.map(u => <option key={u.id} value={u.id} className="bg-[var(--surface)]">{u.nome}</option>)}
                </select>
              ) : (
                <p className="text-sm text-ink/80 py-2">{treinamento.instrutor.nome}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Duração (min)</label>
              <input type="number" min="0" defaultValue={treinamento.duracaoMin || ''} disabled={!podeGerenciar}
                onBlur={e => atualizar({ duracaoMin: e.target.value || null })}
                className="input-glass px-3 py-2 text-sm w-full rounded-xl disabled:opacity-60" />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Grupo</label>
              {podeGerenciar ? (
                <select value={treinamento.grupoJid || ''} onChange={e => atualizar({ grupoJid: e.target.value || null })}
                  className="input-glass px-3 py-2 text-sm w-full rounded-xl">
                  <option value="" className="bg-[var(--surface)]">Nenhum</option>
                  {grupos.map(g => <option key={g.jid} value={g.jid} className="bg-[var(--surface)]">{g.nome}</option>)}
                </select>
              ) : (
                <p className="text-sm text-ink/80 py-2">{treinamento.grupo?.nome || '—'}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Data e horário</label>
              <input type="datetime-local" defaultValue={toDatetimeLocal(treinamento.data)} disabled={!podeGerenciar}
                onChange={e => atualizar({ data: e.target.value || null })}
                className="input-glass px-3 py-2 text-sm w-full rounded-xl disabled:opacity-60" />
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} disabled={!podeGerenciar}
              onBlur={() => descricao !== (treinamento.descricao || '') && atualizar({ descricao })}
              rows={2} placeholder="Sem descrição."
              className="input-glass px-3 py-2 text-sm w-full rounded-xl resize-none disabled:opacity-60" />
          </div>

          {/* Conteúdo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Conteúdo</label>
            <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} disabled={!podeGerenciar}
              onBlur={() => conteudo !== (treinamento.conteudo || '') && atualizar({ conteudo })}
              rows={3} placeholder="O que será abordado neste treinamento."
              className="input-glass px-3 py-2 text-sm w-full rounded-xl resize-none disabled:opacity-60" />
          </div>

          {/* Observações */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink/40 uppercase tracking-wider">Observações</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} disabled={!podeGerenciar}
              onBlur={() => observacoes !== (treinamento.observacoes || '') && atualizar({ observacoes })}
              rows={2} placeholder="Notas adicionais."
              className="input-glass px-3 py-2 text-sm w-full rounded-xl resize-none disabled:opacity-60" />
          </div>

          {/* Materiais */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs text-ink/40 uppercase tracking-wider">Materiais</h4>
            <div className="flex flex-col gap-1">
              {treinamento.materiais.map((m, i) => (
                <div key={i} className="flex items-center gap-2 group px-1 py-1 rounded-lg hover:bg-ink/5">
                  <FontAwesomeIcon icon={faLink} className="text-ink/30 text-xs flex-shrink-0" />
                  <span className="flex-1 text-sm text-ink/80 truncate">{m}</span>
                  {podeGerenciar && (
                    <button onClick={() => removerMaterial(i)} className="opacity-0 group-hover:opacity-100 text-ink/20 hover:text-red-400 transition-all">
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  )}
                </div>
              ))}
              {!treinamento.materiais.length && <p className="text-xs text-ink/20">Nenhum material adicionado.</p>}
            </div>
            {podeGerenciar && (
              <div className="flex gap-2">
                <input value={novoMaterial} onChange={e => setNovoMaterial(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarMaterial()}
                  placeholder="Link ou nome do material…"
                  className="input-glass px-3 py-1.5 text-sm w-full rounded-lg" />
                <button onClick={adicionarMaterial} className="px-3 py-1.5 text-xs bg-accent text-black font-semibold rounded-lg hover:opacity-90 flex-shrink-0">
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
            )}
          </div>

          {/* Participantes */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs text-ink/40 uppercase tracking-wider">Participantes</h4>

            {totalParticipantes > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-ink/40">{concluidos} de {totalParticipantes} participantes concluíram</span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              {treinamento.participantes.map(p => {
                const podeEditarEste = podeGerenciar || p.userId === user?.id
                return (
                  <div key={p.userId} className="glass rounded-xl px-3 py-2 flex items-center gap-3 group">
                    <span className="flex-1 text-sm text-ink/80 truncate">{p.user.nome}</span>
                    {podeEditarEste ? (
                      <select value={p.status} onChange={e => atualizarStatusParticipante(p.userId, e.target.value)}
                        className="input-glass px-2 py-1 text-xs rounded-lg">
                        {STATUS_PARTICIPANTE.map(s => <option key={s} value={s} className="bg-[var(--surface)]">{LABEL_PARTICIPANTE[s]}</option>)}
                      </select>
                    ) : (
                      <ParticipanteStatus status={p.status} className="text-xs" />
                    )}
                    {podeGerenciar && (
                      <button onClick={() => removerParticipante(p.userId)}
                        className="opacity-0 group-hover:opacity-100 text-ink/20 hover:text-red-400 transition-all">
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    )}
                  </div>
                )
              })}
              {!totalParticipantes && <p className="text-xs text-ink/20">Nenhum participante ainda.</p>}
            </div>

            {podeGerenciar && (
              <div className="flex gap-2">
                <select value={novoParticipanteId} onChange={e => setNovoParticipanteId(e.target.value)}
                  className="input-glass px-3 py-1.5 text-sm w-full rounded-lg">
                  <option value="" className="bg-[var(--surface)]">Selecionar usuário…</option>
                  {participantesDisponiveis.map(u => <option key={u.id} value={u.id} className="bg-[var(--surface)]">{u.nome}</option>)}
                </select>
                <button onClick={adicionarParticipante} className="px-3 py-1.5 text-xs bg-accent text-black font-semibold rounded-lg hover:opacity-90 flex-shrink-0">
                  <FontAwesomeIcon icon={faUserPlus} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
