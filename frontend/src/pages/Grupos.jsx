// ── Grupos.jsx ────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComments, faGear, faMagnifyingGlass, faImage, faBoxArchive, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { Modal, StatCard } from '../components/ui/index.jsx'

export function Grupos() {
  const { authHeaders, user, uploadGrupoLogo } = useAuthStore()
  const [grupos, setGrupos] = useState([])
  const [editGrupo, setEditGrupo] = useState(null)
  const [form, setForm] = useState({ slaNormal: '', slaAlto: '' })
  const [arquivados, setArquivados] = useState(false)
  const [busca, setBusca] = useState('')
  const [ordenar, setOrdenar] = useState('nome')
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [detalheGrupo, setDetalheGrupo] = useState(null)
  const [stats, setStats] = useState(null)

  const load = () => fetch(`/api/grupos?arquivado=${arquivados}&ordenar=${ordenar}`, { headers: authHeaders() })
    .then(r => r.json()).then(setGrupos)

  useEffect(() => { load() }, [arquivados, ordenar])

  const abrirDetalhe = (g) => {
    setDetalheGrupo(g)
    setStats(null)
    fetch(`/api/grupos/${encodeURIComponent(g.jid)}/stats`, { headers: authHeaders() })
      .then(r => r.json()).then(setStats)
  }

  const salvar = async () => {
    await fetch(`/api/grupos/${encodeURIComponent(editGrupo.jid)}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ slaNormal: Number(form.slaNormal)||null, slaAlto: Number(form.slaAlto)||null })
    })
    setEditGrupo(null); load()
  }

  const arquivar = async (jid, v) => {
    await fetch(`/api/grupos/${encodeURIComponent(jid)}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ arquivado: v })
    })
    load()
  }

  const canEdit = ['ADMIN','SUPERVISOR'].includes(user?.role)

  const handleLogoChange = async (jid, e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setEnviandoLogo(true)
    try {
      const atualizado = await uploadGrupoLogo(jid, file)
      setGrupos(prev => prev.map(g => g.jid === jid ? { ...g, logo: atualizado.logo } : g))
      setEditGrupo(prev => prev && prev.jid === jid ? { ...prev, logo: atualizado.logo } : prev)
    } catch (err) {
      alert(err.message)
    } finally {
      setEnviandoLogo(false)
    }
  }

  const gruposFiltrados = busca
    ? grupos.filter(g => g.nome?.toLowerCase().includes(busca.toLowerCase()))
    : grupos

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faComments}/> Grupos</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-2 items-center mb-4">
          <div className="relative">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 text-xs" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar grupo…"
              className="input-glass pl-9 pr-4 py-2 text-sm rounded-xl w-56" />
          </div>
          <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
            className="input-glass px-3 py-2 text-xs rounded-xl">
            <option value="nome" className="bg-[var(--surface)]">Nome (A-Z)</option>
            <option value="atendimentos_desc" className="bg-[var(--surface)]">Mais atendimentos</option>
            <option value="atendimentos_asc" className="bg-[var(--surface)]">Menos atendimentos</option>
            <option value="requisicoes_desc" className="bg-[var(--surface)]">Mais requisições</option>
            <option value="requisicoes_asc" className="bg-[var(--surface)]">Menos requisições</option>
            <option value="treinamentos_desc" className="bg-[var(--surface)]">Mais treinamentos</option>
            <option value="treinamentos_asc" className="bg-[var(--surface)]">Menos treinamentos</option>
          </select>
          {['Ativos','Arquivados'].map((l,i) => (
            <button key={l} onClick={() => setArquivados(i===1)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                arquivados===(i===1) ? 'bg-ink/10 text-ink border border-ink/15' : 'text-ink/40 hover:text-ink/70'
              }`}>{l}</button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-ink/10" style={{ background: 'rgb(var(--ink-rgb) / var(--glass-alpha))' }}>
          <table className="min-w-full divide-y divide-ink/10">
            <thead>
              <tr className="*:font-medium *:text-ink/40 *:text-xs *:uppercase *:tracking-wider">
                <th className="px-5 py-3 text-left">Grupo</th>
                <th className="px-5 py-3 text-left">SLA</th>
                <th className="px-5 py-3 text-left">Atendimentos</th>
                <th className="px-5 py-3 text-left">Requisições</th>
                <th className="px-5 py-3 text-left">Treinamentos</th>
                {canEdit && <th className="px-5 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {gruposFiltrados.map(g => (
                <tr key={g.jid} onClick={() => abrirDetalhe(g)}
                  className="cursor-pointer hover:bg-ink/[0.06] transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-ink/10 flex items-center justify-center text-xs font-bold text-ink/60 flex-shrink-0 overflow-hidden">
                        {g.logo
                          ? <img src={g.logo} alt={g.nome} className="w-full h-full object-cover" />
                          : g.nome.substring(0,2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-ink">{g.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink/30">
                    {g.slaNormal ?? '10'}min → Alto | {g.slaAlto ?? '30'}min → Crítico
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink/50">{g._count?.atendimentos}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink/50">{g._count?.requisicoes}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-ink/50">{g._count?.treinamentos}</td>
                  {canEdit && (
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <div className="flex gap-2 justify-end">
                        {!g.arquivado ? (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setEditGrupo(g); setForm({ slaNormal: g.slaNormal||'', slaAlto: g.slaAlto||'' }) }}
                              title="Config"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors">
                              <FontAwesomeIcon icon={faGear}/>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); arquivar(g.jid, true) }}
                              title="Arquivar"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors">
                              <FontAwesomeIcon icon={faBoxArchive}/>
                            </button>
                          </>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); arquivar(g.jid, false) }}
                            title="Reativar"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-accent hover:bg-accent/10 transition-colors">
                            <FontAwesomeIcon icon={faRotateLeft}/>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {detalheGrupo && (
        <Modal title={<><FontAwesomeIcon icon={faComments}/> {detalheGrupo.nome}</>} onClose={() => setDetalheGrupo(null)}>
          {!stats ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-ink/20 border-t-accent rounded-full animate-spin"/>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Atendimentos" value={stats.atendimentos.total}
                sub={`${stats.atendimentos.abertos} em aberto`} color="text-accent" />
              <StatCard label="Requisições" value={stats.requisicoes.total}
                sub={`${stats.requisicoes.abertas} em aberto`} />
              <StatCard label="Treinamentos" value={stats.treinamentos.total} />
            </div>
          )}
        </Modal>
      )}

      {editGrupo && (
        <Modal title={<><FontAwesomeIcon icon={faGear}/> Configurações — {editGrupo.nome}</>} onClose={() => setEditGrupo(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Logo do cliente</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-ink/10 flex items-center justify-center text-sm font-bold text-ink/60 flex-shrink-0 overflow-hidden">
                  {editGrupo.logo
                    ? <img src={editGrupo.logo} alt={editGrupo.nome} className="w-full h-full object-cover" />
                    : editGrupo.nome.substring(0,2).toUpperCase()}
                </div>
                <label className="cursor-pointer text-xs border border-ink/10 px-3 py-1.5 rounded-lg text-ink/50 hover:text-ink hover:border-ink/20 transition-colors">
                  <FontAwesomeIcon icon={faImage}/> {enviandoLogo ? 'Enviando…' : 'Enviar logo'}
                  <input type="file" accept="image/*" className="hidden" disabled={enviandoLogo}
                    onChange={e => handleLogoChange(editGrupo.jid, e)} />
                </label>
              </div>
            </div>
            {[
              { label: 'Minutos até ALTO (padrão: 10)', key: 'slaNormal', ph: '10' },
              { label: 'Minutos até CRÍTICO (padrão: 30)', key: 'slaAlto', ph: '30' },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/40 uppercase tracking-wider">{f.label}</label>
                <input type="number" value={form[f.key]} placeholder={f.ph}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  className="input-glass px-4 py-2.5 text-sm w-full rounded-xl"/>
              </div>
            ))}
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setEditGrupo(null)} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50">Cancelar</button>
              <button onClick={salvar} className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90">Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Grupos
