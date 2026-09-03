import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRobot, faLightbulb, faBolt, faPen } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { Modal } from '../components/ui/index.jsx'

export default function Automacao() {
  const { authHeaders } = useAuthStore()
  const [intencoes, setIntencoes] = useState([])
  const [regras, setRegras] = useState([])
  const [aba, setAba] = useState('intencoes')
  const [modalInt, setModalInt] = useState(null)
  const [modalRegra, setModalRegra] = useState(null)
  const [formInt, setFormInt] = useState({ nome: '', descricao: '', frases: '' })
  const [formRegra, setFormRegra] = useState({ nome: '', gatilho: 'MENSAGEM_CLIENTE', intencaoId: '', confiancaMin: '0.85', acao: 'FINALIZAR', acaoValor: '' })

  const load = async () => {
    const [i, r] = await Promise.all([
      fetch('/api/automacao/intencoes', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/automacao/regras',    { headers: authHeaders() }).then(r => r.json()),
    ])
    setIntencoes(Array.isArray(i) ? i : [])
    setRegras(Array.isArray(r) ? r : [])
  }
  useEffect(() => { load() }, [])

  const salvarInt = async () => {
    const isEdit = modalInt !== 'add'
    const frases = formInt.frases.split('\n').map(s => s.trim()).filter(Boolean)
    const url    = isEdit ? `/api/automacao/intencoes/${modalInt.id}` : '/api/automacao/intencoes'
    await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify({ ...formInt, frases }) })
    setModalInt(null); load()
  }

  const salvarRegra = async () => {
    const isEdit = modalRegra !== 'add'
    const url    = isEdit ? `/api/automacao/regras/${modalRegra.id}` : '/api/automacao/regras'
    const data   = { ...formRegra, intencaoId: formRegra.intencaoId ? Number(formRegra.intencaoId) : null, confiancaMin: Number(formRegra.confiancaMin) }
    await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(data) })
    setModalRegra(null); load()
  }

  const toggleRegra = async (r) => {
    await fetch(`/api/automacao/regras/${r.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ ...r, ativa: !r.ativa }) })
    load()
  }

  const delInt = async (id) => { if (!confirm('Excluir intenção?')) return; await fetch(`/api/automacao/intencoes/${id}`, { method: 'DELETE', headers: authHeaders() }); load() }
  const delRegra = async (id) => { if (!confirm('Excluir regra?')) return; await fetch(`/api/automacao/regras/${id}`, { method: 'DELETE', headers: authHeaders() }); load() }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faRobot}/> Automações</h1>
        <div className="flex gap-2">
          {['intencoes','regras'].map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${aba===a ? 'bg-ink/10 text-ink border border-ink/15' : 'text-ink/40 hover:text-ink/70'}`}>
              {a === 'intencoes' ? <><FontAwesomeIcon icon={faLightbulb}/> Intenções</> : <><FontAwesomeIcon icon={faBolt}/> Regras</>}
            </button>
          ))}
        </div>
        <button onClick={() => aba === 'intencoes' ? (setModalInt('add'), setFormInt({nome:'',descricao:'',frases:''})) : (setModalRegra('add'), setFormRegra({nome:'',gatilho:'MENSAGEM_CLIENTE',intencaoId:'',confiancaMin:'0.85',acao:'FINALIZAR',acaoValor:''}))}
          className="ml-auto bg-accent text-black font-semibold text-sm px-4 py-2 rounded-xl hover:opacity-90">
          + {aba === 'intencoes' ? 'Intenção' : 'Regra'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {aba === 'intencoes' && (
          <div className="flex flex-col gap-3 max-w-2xl">
            {intencoes.map(i => (
              <div key={i.id} className="glass rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-ink">{i.nome}</div>
                    {i.descricao && <div className="text-xs text-ink/40 mt-0.5">{i.descricao}</div>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setModalInt(i); setFormInt({ nome: i.nome, descricao: i.descricao||'', frases: i.frases.join('\n') }) }}
                      className="text-xs border border-ink/10 px-3 py-1.5 rounded-lg text-ink/50 hover:text-ink">Editar</button>
                    <button onClick={() => delInt(i.id)} className="text-xs border border-red-400/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-400/10">Excluir</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {i.frases.map(f => (
                    <span key={f} className="text-xs bg-ink/5 border border-ink/10 px-2.5 py-1 rounded-full text-ink/60">{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {aba === 'regras' && (
          <div className="flex flex-col gap-3 max-w-2xl">
            {regras.map(r => (
              <div key={r.id} className={`glass rounded-xl p-5 flex items-center gap-4 ${!r.ativa ? 'opacity-50' : ''}`}>
                <button onClick={() => toggleRegra(r)} className={`w-10 h-6 rounded-full border transition-all flex-shrink-0 ${r.ativa ? 'bg-accent border-accent' : 'bg-ink/5 border-ink/20'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white transition-all mx-0.5 ${r.ativa ? 'translate-x-4' : ''}`}/>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{r.nome}</div>
                  <div className="text-xs text-ink/40 mt-0.5">
                    {r.gatilho} → {r.intencao?.nome || 'qualquer'} → {r.acao}
                    {r.confiancaMin && ` (conf. ≥ ${Math.round(r.confiancaMin * 100)}%)`}
                  </div>
                </div>
                <button onClick={() => { setModalRegra(r); setFormRegra({ nome: r.nome, gatilho: r.gatilho, intencaoId: r.intencaoId||'', confiancaMin: r.confiancaMin, acao: r.acao, acaoValor: r.acaoValor||'' }) }}
                  className="text-xs border border-ink/10 px-3 py-1.5 rounded-lg text-ink/50 hover:text-ink flex-shrink-0">Editar</button>
                <button onClick={() => delRegra(r.id)} className="text-xs border border-red-400/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-400/10 flex-shrink-0">Excluir</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Intenção */}
      {modalInt && (
        <Modal title={modalInt === 'add' ? '+ Nova intenção' : <><FontAwesomeIcon icon={faPen}/> {modalInt.nome}</>} onClose={() => setModalInt(null)}>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Nome', key: 'nome', ph: 'Cliente finalizou' },
              { label: 'Descrição', key: 'descricao', ph: 'Opcional' },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs text-ink/40 uppercase tracking-wider">{f.label}</label>
                <input value={formInt[f.key]} placeholder={f.ph} onChange={e => setFormInt(p => ({...p, [f.key]: e.target.value}))} className="input-glass px-4 py-2.5 text-sm w-full rounded-xl"/>
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Frases (uma por linha)</label>
              <textarea value={formInt.frases} onChange={e => setFormInt(p => ({...p, frases: e.target.value}))} rows={6}
                placeholder={"obrigado\nobrigada\nvaleu\nentendi"} className="input-glass px-4 py-2.5 text-sm w-full rounded-xl resize-none"/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalInt(null)} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50">Cancelar</button>
              <button onClick={salvarInt} className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90">Salvar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Regra */}
      {modalRegra && (
        <Modal title={modalRegra === 'add' ? '+ Nova regra' : <><FontAwesomeIcon icon={faPen}/> {modalRegra.nome}</>} onClose={() => setModalRegra(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Nome</label>
              <input value={formRegra.nome} onChange={e => setFormRegra(p => ({...p, nome: e.target.value}))} className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" placeholder="Auto-finalizar"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Gatilho', key: 'gatilho', opts: ['MENSAGEM_CLIENTE','MENSAGEM_AGENTE','TEMPO_SEM_RESPOSTA'] },
                { label: 'Ação',    key: 'acao',    opts: ['FINALIZAR','NOTIFICAR_SUPERVISOR','MUDAR_PRIORIDADE'] },
              ].map(f => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink/40 uppercase tracking-wider">{f.label}</label>
                  <select value={formRegra[f.key]} onChange={e => setFormRegra(p => ({...p, [f.key]: e.target.value}))} className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Intenção (opcional)</label>
              <select value={formRegra.intencaoId} onChange={e => setFormRegra(p => ({...p, intencaoId: e.target.value}))} className="input-glass px-4 py-2.5 text-sm w-full rounded-xl">
                <option value="">Qualquer mensagem</option>
                {intencoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink/40 uppercase tracking-wider">Confiança mínima (%)</label>
              <input type="number" min="0" max="100" value={Math.round(Number(formRegra.confiancaMin)*100)}
                onChange={e => setFormRegra(p => ({...p, confiancaMin: Number(e.target.value)/100}))}
                className="input-glass px-4 py-2.5 text-sm w-full rounded-xl" placeholder="85"/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalRegra(null)} className="px-4 py-2 text-sm border border-ink/10 rounded-xl text-ink/50">Cancelar</button>
              <button onClick={salvarRegra} className="px-6 py-2 text-sm bg-accent text-black font-semibold rounded-xl hover:opacity-90">Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
