import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faPen, faTrash, faPaperclip, faVideo, faImage, faUpload, faPlus, faBell, faArrowUpRightFromSquare, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore, useToastStore } from '../stores/index.js'
import { Modal } from '../components/ui/index.jsx'

const EMPTY = { nome: '', descricao: '', grupoJid: '', status: 'ABERTA', prioridade: 'NORMAL', responsavelId: '', prazo: '', avisoIntervaloMinutos: '', tagIds: [] }

const AVISO_OPCOES = [
  { valor: '', label: 'Sem lembrete' },
  { valor: '30', label: 'A cada 30 minutos' },
  { valor: '60', label: 'A cada 1 hora' },
  { valor: '180', label: 'A cada 3 horas' },
  { valor: '360', label: 'A cada 6 horas' },
  { valor: '720', label: 'A cada 12 horas' },
  { valor: '1440', label: 'A cada 1 dia' },
  { valor: '2880', label: 'A cada 2 dias' },
  { valor: '10080', label: 'A cada 7 dias' },
]

const STATUS_MAP = {
  ABERTA:       { cls: 'text-red-400 bg-red-400/10 border-red-400/20',   label: 'Aberta',       dot: 'bg-red-400'  },
  EM_ANDAMENTO: { cls: 'text-accent bg-accent/10 border-accent/20',      label: 'Em andamento', dot: 'bg-accent'   },
  CONCLUIDA:    { cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',label: 'Concluída',    dot: 'bg-blue-400' },
}
const STATUS_ORDEM = ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA']

const PRIORIDADE_MAP = {
  BAIXA:   { cls: 'text-ink/40 bg-ink/5 border-ink/10',            label: 'Baixa'   },
  NORMAL:  { cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',     label: 'Normal'  },
  ALTA:    { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20',  label: 'Alta'    },
  URGENTE: { cls: 'text-red-400 bg-red-400/10 border-red-400/20',        label: 'Urgente' },
}

const iniciais = (nome) => (nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')

export default function Requisicoes() {
  const { authHeaders, token } = useAuthStore()
  const { sucesso: toastSucesso, erro: toastErro } = useToastStore()
  const [requisicoes, setRequisicoes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [tags, setTags] = useState([])
  const [modal, setModal] = useState(null) // null | 'add' | requisicao
  const [form, setForm] = useState(EMPTY)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [novaTag, setNovaTag] = useState('')
  const [colapsados, setColapsados] = useState({})

  const toggleGrupo = (status) => setColapsados(p => ({ ...p, [status]: !p[status] }))

  const load = () => fetch('/api/requisicoes', { headers: authHeaders() })
    .then(r => { if (!r.ok) throw new Error('Falha ao carregar requisições'); return r.json() })
    .then(setRequisicoes)
    .catch(err => toastErro(err.message))
  const loadGrupos = () => fetch('/api/grupos', { headers: authHeaders() })
    .then(r => { if (!r.ok) throw new Error('Falha ao carregar grupos'); return r.json() })
    .then(setGrupos)
    .catch(err => toastErro(err.message))
  const loadUsuarios = () => fetch('/api/usuarios', { headers: authHeaders() })
    .then(r => { if (!r.ok) throw new Error('Falha ao carregar usuários'); return r.json() })
    .then(setUsuarios)
    .catch(err => toastErro(err.message))
  const loadTags = () => fetch('/api/tags', { headers: authHeaders() })
    .then(r => { if (!r.ok) throw new Error('Falha ao carregar tags'); return r.json() })
    .then(setTags)
    .catch(err => toastErro(err.message))

  useEffect(() => { load(); loadGrupos(); loadUsuarios(); loadTags() }, [])

  const abrir = (req) => {
    setErro(''); setNovaTag('')
    if (req) setForm({
      nome: req.nome, descricao: req.descricao || '', grupoJid: req.grupoJid, status: req.status,
      prioridade: req.prioridade, responsavelId: req.responsavelId || '',
      prazo: req.prazo ? req.prazo.slice(0, 10) : '', avisoIntervaloMinutos: req.avisoIntervaloMinutos || '',
      tagIds: req.tags?.map(t => t.id) || [],
    })
    else setForm(EMPTY)
    setModal(req || 'add')
  }

  const recarregarModal = async (id) => {
    const r = await fetch(`/api/requisicoes/${id}`, { headers: authHeaders() })
    if (!r.ok) { toastErro('Falha ao recarregar requisição'); return }
    setModal(await r.json())
  }

  const salvar = async () => {
    setErro('')
    if (!form.nome.trim()) { setErro('Informe o nome da requisição'); return }
    if (!form.grupoJid) { setErro('Selecione o grupo solicitante'); return }

    setSalvando(true)
    const isEdit = modal !== 'add'
    const url    = isEdit ? `/api/requisicoes/${modal.id}` : '/api/requisicoes'
    const method = isEdit ? 'PUT' : 'POST'
    const payload = { ...form, nome: form.nome.trim(), avisoIntervaloMinutos: form.prazo ? form.avisoIntervaloMinutos : '' }
    try {
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(data.error || 'Não foi possível salvar a requisição'); return }
      toastSucesso(isEdit ? 'Requisição atualizada com sucesso' : 'Requisição cadastrada com sucesso')
      await load()
      setModal(data) // mantém modal aberto (edição) para permitir anexar mídia logo em seguida
    } catch {
      setErro('Falha de conexão ao salvar a requisição')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir esta requisição?')) return
    try {
      const r = await fetch(`/api/requisicoes/${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível excluir a requisição')
      setModal(null)
      toastSucesso('Requisição excluída')
      await load()
    } catch (err) {
      toastErro(err.message)
    }
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || modal === 'add' || !modal) return
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      const r = await fetch(`/api/requisicoes/${modal.id}/anexos`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { toastErro(data.error || 'Erro ao enviar arquivo'); return }
      await recarregarModal(modal.id)
      await load()
      toastSucesso('Arquivo anexado com sucesso')
    } catch {
      toastErro('Falha de conexão ao enviar o arquivo')
    } finally {
      setEnviando(false)
      e.target.value = ''
    }
  }

  const removerAnexo = async (anexoId) => {
    try {
      const r = await fetch(`/api/requisicoes/${modal.id}/anexos/${anexoId}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível remover o anexo')
      await recarregarModal(modal.id)
      await load()
      toastSucesso('Anexo removido')
    } catch (err) {
      toastErro(err.message)
    }
  }

  const toggleTag = (id) => setForm(p => ({
    ...p, tagIds: p.tagIds.includes(id) ? p.tagIds.filter(t => t !== id) : [...p.tagIds, id],
  }))

  const criarTag = async () => {
    if (!novaTag.trim()) return
    try {
      const r = await fetch('/api/tags', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ nome: novaTag.trim() }) })
      const tag = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(tag.error || 'Não foi possível criar a tag')
      setNovaTag('')
      await loadTags()
      setForm(p => ({ ...p, tagIds: p.tagIds.includes(tag.id) ? p.tagIds : [...p.tagIds, tag.id] }))
    } catch (err) {
      toastErro(err.message)
    }
  }

  const nomeGrupo = (jid) => grupos.find(g => g.jid === jid)?.nome || jid

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faClipboardList}/> Requisições</h1>
        <button onClick={() => abrir(null)}
          className="ml-auto bg-accent text-black font-semibold text-sm px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
          + Nova requisição
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-5">
          {STATUS_ORDEM.map(status => {
            const itens = requisicoes.filter(r => r.status === status)
            if (itens.length === 0) return null
            const info = STATUS_MAP[status]
            const fechado = !!colapsados[status]
            return (
              <div key={status} className="flex flex-col gap-2">
                <button onClick={() => toggleGrupo(status)}
                  className="flex items-center gap-2 text-xs font-semibold text-ink/50 uppercase tracking-wider hover:text-ink/80 transition-colors w-fit">
                  <FontAwesomeIcon icon={fechado ? faChevronRight : faChevronDown} className="text-[10px]"/>
                  <span className={`w-2 h-2 rounded-full ${info.dot}`}/>
                  {info.label}
                  <span className="text-ink/30 font-normal normal-case">({itens.length})</span>
                </button>

                {!fechado && itens.map(req => (
                  <div key={req.id} onClick={() => abrir(req)}
                    className="glass rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-ink/[0.02]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{req.nome}</span>
                        {req.anexos?.length > 0 && (
                          <span className="text-xs text-ink/30 flex items-center gap-1">
                            <FontAwesomeIcon icon={faPaperclip}/> {req.anexos.length}
                          </span>
                        )}
                        {req.clickupTaskId && (
                          <a href={`https://app.clickup.com/t/${req.clickupTaskId}`} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-ink/30 hover:text-ink/60 flex items-center gap-1">
                            <FontAwesomeIcon icon={faArrowUpRightFromSquare}/> ClickUp
                          </a>
                        )}
                        {req.tags?.map(t => (
                          <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full border border-ink/10 text-ink/40">{t.nome}</span>
                        ))}
                      </div>
                      {req.descricao && <div className="text-xs text-ink/40 mt-0.5 truncate">{req.descricao}</div>}
                      <div className="text-xs text-ink/30 mt-1">
                        Grupo: {req.grupo?.nome || nomeGrupo(req.grupoJid)} · Cadastrado por {req.criador?.nome}
                        {req.prazo && <> · Prazo: {new Date(req.prazo).toLocaleDateString('pt-BR')}</>}
                        {req.prazo && req.avisoIntervaloMinutos && (
                          <> · <FontAwesomeIcon icon={faBell}/> {AVISO_OPCOES.find(o => Number(o.valor) === req.avisoIntervaloMinutos)?.label || `a cada ${req.avisoIntervaloMinutos}min`}</>
                        )}
                        {' · '}{new Date(req.criadoEm).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    {req.responsavel && (
                      <span title={req.responsavel.nome}
                        className="w-7 h-7 rounded-full bg-accent/15 text-accent text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                        {iniciais(req.responsavel.nome)}
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full border flex-shrink-0 ${PRIORIDADE_MAP[req.prioridade]?.cls || ''}`}>
                      {PRIORIDADE_MAP[req.prioridade]?.label || req.prioridade}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
          {requisicoes.length === 0 && (
            <div className="text-sm text-ink/30 text-center py-10">Nenhuma requisição cadastrada</div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? '+ Nova requisição' : <><FontAwesomeIcon icon={faPen}/> {modal.nome}</>} onClose={() => setModal(null)} width="max-w-2xl">
          <div className="flex flex-col gap-4">
            {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3">{erro}</div>}

            {modal !== 'add' && modal.clickupTaskId && (
              <a href={`https://app.clickup.com/t/${modal.clickupTaskId}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent hover:opacity-80 flex items-center gap-1.5 w-fit break-all">
                <FontAwesomeIcon icon={faArrowUpRightFromSquare}/> {`https://app.clickup.com/t/${modal.clickupTaskId}`}
              </a>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Nome da requisição</label>
              <input type="text" value={form.nome} placeholder="Ex: Ajuste no material de campanha"
                onChange={e => setForm(p => ({...p, nome: e.target.value}))}
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl"/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Detalhes</label>
              <textarea rows={4} value={form.descricao} placeholder="Descreva a requisição..."
                onChange={e => setForm(p => ({...p, descricao: e.target.value}))}
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl resize-none"/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Grupo solicitante</label>
              <select value={form.grupoJid} onChange={e => setForm(p => ({...p, grupoJid: e.target.value}))}
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
                <option value="">Selecione um grupo</option>
                {grupos.map(g => <option key={g.jid} value={g.jid}>{g.nome}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/40 uppercase tracking-wider">Prioridade</label>
                <select value={form.prioridade} onChange={e => setForm(p => ({...p, prioridade: e.target.value}))}
                  className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
                  {Object.entries(PRIORIDADE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/40 uppercase tracking-wider">Prazo</label>
                <input type="date" value={form.prazo}
                  onChange={e => setForm(p => ({...p, prazo: e.target.value}))}
                  className="input-glass px-4 py-2.5 text-sm w-full rounded-xl"/>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Lembrete de prazo</label>
              <select value={form.avisoIntervaloMinutos} disabled={!form.prazo}
                onChange={e => setForm(p => ({...p, avisoIntervaloMinutos: e.target.value}))}
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl disabled:opacity-40">
                {AVISO_OPCOES.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
              </select>
              {!form.prazo && <span className="text-[11px] text-ink/30">Defina um prazo para poder configurar o lembrete</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Responsável</label>
              <select value={form.responsavelId} onChange={e => setForm(p => ({...p, responsavelId: e.target.value}))}
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
                <option value="">Sem responsável</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>

            {modal !== 'add' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/40 uppercase tracking-wider">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}
                  className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.tagIds.includes(t.id) ? 'border-accent/40 bg-accent/10 text-accent' : 'border-ink/10 text-ink/40 hover:text-ink/70'
                    }`}>{t.nome}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <input type="text" value={novaTag} placeholder="Nova tag"
                  onChange={e => setNovaTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), criarTag())}
                  className="input-glass px-3 py-2 text-xs flex-1 rounded-lg"/>
                <button type="button" onClick={criarTag} className="text-xs px-3 py-2 rounded-lg border border-ink/10 text-ink/50 hover:text-ink transition-colors">
                  <FontAwesomeIcon icon={faPlus}/>
                </button>
              </div>
            </div>

            {modal !== 'add' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/40 uppercase tracking-wider">Fotos e vídeos</label>
                <div className="flex flex-wrap gap-2">
                  {modal.anexos?.map(a => (
                    <div key={a.id} className="relative group w-20 h-20 rounded-lg overflow-hidden bg-ink/5 border border-ink/10 flex-shrink-0">
                      {a.tipo === 'image'
                        ? <img src={a.url} alt={a.nome} className="w-full h-full object-cover"/>
                        : <video src={a.url} className="w-full h-full object-cover"/>
                      }
                      <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                        <FontAwesomeIcon icon={a.tipo === 'image' ? faImage : faVideo}/>
                      </span>
                      <button onClick={() => removerAnexo(a.id)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity">
                        <FontAwesomeIcon icon={faTrash}/>
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border border-dashed border-ink/15 flex flex-col items-center justify-center gap-1 text-ink/30 hover:text-ink/60 hover:border-ink/30 cursor-pointer transition-colors flex-shrink-0">
                    <FontAwesomeIcon icon={faUpload}/>
                    <span className="text-[10px]">{enviando ? 'Enviando...' : 'Anexar'}</span>
                    <input type="file" accept="image/*,video/*" className="hidden" disabled={enviando} onChange={upload}/>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-between mt-2">
              {modal !== 'add'
                ? <button onClick={() => excluir(modal.id)} className="px-4 py-2 text-sm border border-red-400/20 text-red-400 rounded-xl hover:bg-red-400/10 transition-colors">Excluir</button>
                : <span/>
              }
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} disabled={salvando} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50 disabled:opacity-40">Fechar</button>
                <button onClick={salvar} disabled={salvando}
                  className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 disabled:opacity-60">
                  {salvando ? 'Salvando…' : modal === 'add' ? 'Cadastrar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
