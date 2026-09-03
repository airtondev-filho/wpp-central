import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faPen, faCamera, faMagnifyingGlass, faRotateLeft, faBan } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore, useToastStore } from '../stores/index.js'
import { Modal, Moldura, TituloBadge, BannerPreview } from '../components/ui/index.jsx'

const EMPTY = { nome: '', email: '', senha: '', role: 'AGENTE', numero: '' }
const ROLES = ['AGENTE','SUPERVISOR','ADMIN','VISUALIZACAO']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Agentes() {
  const { authHeaders, uploadAgenteAvatar, user } = useAuthStore()
  const { sucesso: toastSucesso, erro: toastErro } = useToastStore()
  const podeEditar = user?.role !== 'AGENTE' // agente comum só pode visualizar a equipe
  const [agentes, setAgentes] = useState([])
  const [modal, setModal] = useState(null) // null | 'add' | agente
  const [form, setForm] = useState(EMPTY)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoAvatar, setEnviandoAvatar] = useState(false)
  const [busca, setBusca] = useState('')
  const [ordenar, setOrdenar] = useState('nome')
  const [inativos, setInativos] = useState(false)

  const load = () => fetch('/api/agentes', { headers: authHeaders() })
    .then(r => { if (!r.ok) throw new Error('Falha ao carregar agentes'); return r.json() })
    .then(setAgentes)
    .catch(err => toastErro(err.message))
  useEffect(() => { load() }, [])

  const abrir = (ag) => {
    setErro('')
    if (ag) { setForm({ nome: ag.nome, email: ag.email, senha: '', role: ag.role, numero: ag.numero||'' }); setModal(ag) }
    else { setForm(EMPTY); setModal('add') }
  }

  const validar = () => {
    const isEdit = modal !== 'add'
    const nome = form.nome.trim()
    const email = form.email.trim()
    if (!nome) return 'Informe o nome do agente'
    if (!email) return 'Informe o email do agente'
    if (!EMAIL_RE.test(email)) return 'Email inválido'
    if (!isEdit && form.senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres'
    if (isEdit && form.senha && form.senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres'
    if (form.numero && form.numero.replace(/\D/g,'').length < 10) return 'Número de WhatsApp inválido'
    return ''
  }

  const salvar = async () => {
    const msgValidacao = validar()
    if (msgValidacao) { setErro(msgValidacao); return }

    setErro('')
    setSalvando(true)
    const isEdit = modal !== 'add'
    const url    = isEdit ? `/api/agentes/${modal.id}` : '/api/agentes'
    const method = isEdit ? 'PUT' : 'POST'
    const body   = { ...form, nome: form.nome.trim(), email: form.email.trim() }
    if (isEdit) {
      body.ativo = modal.ativo
      if (!body.senha) delete body.senha
    }
    try {
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(data.error || 'Não foi possível salvar o agente'); return }
      setModal(null)
      toastSucesso(isEdit ? 'Agente atualizado com sucesso' : 'Agente adicionado com sucesso')
      await load()
    } catch {
      setErro('Falha de conexão ao salvar o agente')
    } finally {
      setSalvando(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || modal === 'add') return
    setEnviandoAvatar(true)
    try {
      const atualizado = await uploadAgenteAvatar(modal.id, file)
      setAgentes(prev => prev.map(a => a.id === modal.id ? { ...a, avatar: atualizado.avatar } : a))
      setModal(prev => prev && prev.id === modal.id ? { ...prev, avatar: atualizado.avatar } : prev)
      toastSucesso('Foto atualizada com sucesso')
    } catch (err) {
      toastErro(err.message)
    } finally {
      setEnviandoAvatar(false)
    }
  }

  const desativar = async (id) => {
    if (!confirm('Desativar agente?')) return
    try {
      const r = await fetch(`/api/agentes/${id}`, { method: 'DELETE', headers: authHeaders() })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Não foi possível desativar o agente')
      toastSucesso('Agente desativado')
      await load()
    } catch (err) {
      toastErro(err.message)
    }
  }

  // Easter eggs — clicar 20x na linha do agente com o número correspondente desbloqueia a conquista.
  const EASTER_EGGS = [
    { numero: '556299320983', chave: 'pequenino', endpoint: '/api/gamificacao/pequenino' },
    { numero: '556282386452', chave: 'idosoMaster', endpoint: '/api/gamificacao/idoso-master' },
  ]
  const registrarCliqueEasterEgg = (numeroAgente) => {
    const egg = EASTER_EGGS.find(e => e.numero === numeroAgente)
    if (!egg) return
    if (localStorage.getItem(`${egg.chave}Desbloqueado`) === '1') return
    const cliques = Number(localStorage.getItem(`${egg.chave}Cliques`) || '0') + 1
    localStorage.setItem(`${egg.chave}Cliques`, String(cliques))
    if (cliques >= 20) {
      localStorage.setItem(`${egg.chave}Desbloqueado`, '1')
      fetch(egg.endpoint, { method: 'POST', headers: authHeaders() }).catch(() => {})
    }
  }

  const reativar = async (ag) => {
    try {
      const r = await fetch(`/api/agentes/${ag.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ nome: ag.nome, email: ag.email, role: ag.role, numero: ag.numero || '', ativo: true })
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Não foi possível reativar o agente')
      toastSucesso('Agente reativado')
      await load()
    } catch (err) {
      toastErro(err.message)
    }
  }

  const agentesFiltrados = agentes
    .filter(a => inativos ? !a.ativo : a.ativo)
    .filter(a => busca
      ? a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase())
      : true)
    .sort((a, b) => {
      if (ordenar === 'role') return a.role.localeCompare(b.role)
      if (ordenar === 'online_desc') return (b.online?1:0) - (a.online?1:0)
      return a.nome.localeCompare(b.nome)
    })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faUsers}/> Agentes</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-2 items-center mb-4">
          {podeEditar && (
            <button onClick={() => abrir(null)}
              className="bg-accent text-black font-semibold text-sm px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
              + Novo agente
            </button>
          )}
          <div className="flex gap-2 items-center ml-auto">
            <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
              className="input-glass px-3 py-2 text-xs rounded-xl">
              <option value="nome" className="bg-[var(--surface)]">Nome (A-Z)</option>
              <option value="role" className="bg-[var(--surface)]">Perfil</option>
              <option value="online_desc" className="bg-[var(--surface)]">Online primeiro</option>
            </select>
            {['Ativos','Inativos'].map((l,i) => (
              <button key={l} onClick={() => setInativos(i===1)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  inativos===(i===1) ? 'bg-ink/10 text-ink border border-ink/15' : 'text-ink/40 hover:text-ink/70'
                }`}>{l}</button>
            ))}
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 text-xs" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar agente…"
                className="input-glass pl-9 pr-4 py-2 text-sm rounded-xl w-56" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-ink/10" style={{ background: 'rgb(var(--ink-rgb) / var(--glass-alpha))' }}>
          <table className="min-w-full divide-y divide-ink/10">
            <thead>
              <tr className="*:font-medium *:text-ink/40 *:text-xs *:uppercase *:tracking-wider">
                <th className="px-5 py-3 text-left">Agente</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Número</th>
                <th className="px-5 py-3 text-left">Perfil</th>
                {podeEditar && <th className="px-5 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {agentesFiltrados.map(a => (
                <tr key={a.id}
                  onClick={() => { if (podeEditar) abrir(a); registrarCliqueEasterEgg(a.numero?.replace(/\D/g,'')) }}
                  className={`transition-colors hover:bg-ink/[0.06] ${podeEditar ? 'cursor-pointer' : ''}`}>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Moldura slug={a.molduraEquipada} size={36}>
                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0 overflow-hidden">
                          {a.avatar
                            ? <img src={a.avatar} alt={a.nome} className="w-full h-full object-cover" />
                            : a.nome.charAt(0).toUpperCase()}
                        </div>
                      </Moldura>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">{a.nome}</span>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.online ? 'bg-accent' : 'bg-ink/20'}`}/>
                          {a.tituloEquipado && <TituloBadge slug={a.tituloEquipado}/>}
                        </div>
                        {a.ultimoAcesso && <div className="text-[11px] text-ink/20">Último acesso: {new Date(a.ultimoAcesso).toLocaleString('pt-BR')}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink/50">{a.email}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink/30">{a.numero ? `+${a.numero}` : '—'}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${
                      a.role === 'ADMIN' ? 'border-purple-400/30 text-purple-400'
                      : a.role === 'SUPERVISOR' ? 'border-blue-400/30 text-blue-400'
                      : 'border-ink/10 text-ink/40'
                    }`}>{a.role}</span>
                  </td>
                  {podeEditar && (
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={(e) => { e.stopPropagation(); abrir(a) }} title="Editar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors">
                        <FontAwesomeIcon icon={faPen}/>
                      </button>
                      {a.ativo
                        ? <button onClick={(e) => { e.stopPropagation(); desativar(a.id) }} title="Desativar"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                            <FontAwesomeIcon icon={faBan}/>
                          </button>
                        : <button onClick={(e) => { e.stopPropagation(); reativar(a) }} title="Reativar"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-accent hover:bg-accent/10 transition-colors">
                            <FontAwesomeIcon icon={faRotateLeft}/>
                          </button>
                      }
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? '+ Novo agente' : <><FontAwesomeIcon icon={faPen}/> {modal.nome}</>} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3">{erro}</div>}
            {modal !== 'add' && modal.bannerEquipado && (
              <BannerPreview slug={modal.bannerEquipado} className="h-16 -mt-1"/>
            )}
            {modal !== 'add' && (
              <div className="flex flex-col items-center gap-1.5">
                <Moldura slug={modal.molduraEquipada} size={64}>
                  <label
                    title="Alterar foto de perfil"
                    className="relative w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-lg font-bold text-accent overflow-hidden cursor-pointer group/avatar">
                    {modal.avatar
                      ? <img src={modal.avatar} alt={modal.nome} className="w-full h-full object-cover" />
                      : modal.nome.charAt(0).toUpperCase()}
                    <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${enviandoAvatar ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100'}`}>
                      <FontAwesomeIcon icon={faCamera} className={`text-xs text-ink ${enviandoAvatar ? 'animate-pulse' : ''}`} />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={enviandoAvatar} />
                  </label>
                </Moldura>
                <span className="text-[11px] text-ink/30">Clique na foto para alterar</span>
              </div>
            )}
            {[
              { label: 'Nome',   key: 'nome',   type: 'text',     ph: 'João Silva'       },
              { label: 'Email',  key: 'email',  type: 'email',    ph: 'joao@empresa.com' },
              { label: 'Senha',  key: 'senha',  type: 'password', ph: modal === 'add' ? 'mínimo 6 chars' : '(em branco = manter)' },
              { label: 'Número WhatsApp', key: 'numero', type: 'text', ph: '5511999887766' },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/40 uppercase tracking-wider">{f.label}</label>
                <input type={f.type} value={form[f.key]} placeholder={f.ph}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  className="input-glass px-4 py-2.5 text-sm w-full rounded-xl"/>
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Perfil</label>
              <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setModal(null)} disabled={salvando} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50 disabled:opacity-40">Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90 disabled:opacity-60">
                {salvando ? 'Salvando…' : modal === 'add' ? 'Adicionar' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
