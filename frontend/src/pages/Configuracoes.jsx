import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faCheck, faClock, faCircleInfo, faTriangleExclamation, faCircleExclamation, faChartLine, faTrophy, faVolumeHigh, faVolumeXmark, faPlay, faVideo, faRightLeft } from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { useAuthStore, useNotificacaoStore } from '../stores/index.js'
import { SONS, tocarNotificacao } from '../utils/notificationSound.js'

export default function Configuracoes() {
  const { authHeaders } = useAuthStore()
  const [config, setConfig] = useState({
    sla_normal: '10', sla_alto: '30', raiox_hora_reset: '00:00',
    pontos_atendimento: '10', pontos_reuniao: '10', pontos_requisicao: '10',
    redirecionamento_prazo_minutos: '15', redirecionamento_bonus: '5', redirecionamento_penalidade: '10',
    nivel_prata_min: '100', nivel_ouro_min: '300', nivel_diamante_min: '700'
  })
  const [saved, setSaved] = useState(false)
  const { ativo, volume, som, setAtivo, setVolume, setSom } = useNotificacaoStore()
  const [googleConectado, setGoogleConectado] = useState(null)
  const [conectandoGoogle, setConectandoGoogle] = useState(false)

  useEffect(() => {
    fetch('/api/config', { headers: authHeaders() }).then(r => r.json()).then(c => setConfig(prev => ({...prev, ...c})))
  }, [])

  useEffect(() => {
    fetch('/api/auth/google/status', { headers: authHeaders() }).then(r => r.json()).then(d => setGoogleConectado(d.conectado))
    const params = new URLSearchParams(window.location.search)
    if (params.has('google')) {
      if (params.get('google') === 'conectado') alert('Conta Google conectada com sucesso!')
      else alert('Não foi possível conectar com o Google. Tente novamente.')
      window.history.replaceState({}, '', '/configuracoes')
    }
  }, [])

  const conectarGoogle = async () => {
    setConectandoGoogle(true)
    try {
      const r = await fetch('/api/auth/google/start', { headers: authHeaders() })
      const { url } = await r.json()
      window.location.href = url
    } catch {
      setConectandoGoogle(false)
    }
  }

  const salvar = async () => {
    await fetch('/api/config', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(config) })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const Field = ({ label, hint, configKey, type = 'number', suffix }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink">{label}</label>
      {hint && <p className="text-xs text-ink/40">{hint}</p>}
      <div className="flex items-center gap-2">
        <input type={type} value={config[configKey] || ''}
          onChange={e => setConfig(p => ({...p, [configKey]: e.target.value}))}
          className="input-glass px-4 py-2.5 text-sm rounded-xl w-40"/>
        {suffix && <span className="text-xs text-ink/40">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <div>
          <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faGear}/> Configurações</h1>
          <p className="text-xs text-ink/40">Configurações globais do sistema</p>
        </div>
        <button onClick={salvar} className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${saved ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-accent text-black hover:opacity-90'}`}>
          {saved ? <><FontAwesomeIcon icon={faCheck}/> Salvo!</> : 'Salvar'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6">

          {/* SLA */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faClock}/> SLA Global</h2>
              <p className="text-xs text-ink/40 mt-1">Tempo até escalada de prioridade. Pode ser sobrescrito por grupo.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Normal → Alto" hint="Minutos sem resposta" configKey="sla_normal" suffix="minutos"/>
              <Field label="Alto → Crítico" hint="Minutos sem resposta" configKey="sla_alto" suffix="minutos"/>
            </div>
            <div className="p-4 rounded-xl bg-ink/3 border border-ink/5 text-xs text-ink/40">
              <div className="font-medium text-ink/60 mb-2">Exemplo com os valores acima:</div>
              <div className="flex items-center gap-3">
                <span className="text-blue-400"><FontAwesomeIcon icon={faCircleInfo}/> 0min — Normal</span>
                <span>→</span>
                <span className="text-amber-400"><FontAwesomeIcon icon={faTriangleExclamation}/> {config.sla_normal || 10}min — Alto</span>
                <span>→</span>
                <span className="text-red-400"><FontAwesomeIcon icon={faCircleExclamation}/> {config.sla_alto || 30}min — Crítico</span>
              </div>
            </div>
          </div>

          {/* Gamificação */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faTrophy}/> Pontos de Gamificação</h2>
              <p className="text-xs text-ink/40 mt-1">Quantos pontos o agente ganha ao realizar cada ação.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Atendimento finalizado" hint="Por atendimento" configKey="pontos_atendimento" suffix="pontos"/>
              <Field label="Reunião concluída" hint="Por reunião/treinamento" configKey="pontos_reuniao" suffix="pontos"/>
              <Field label="Requisição cadastrada" hint="Ao criar a requisição" configKey="pontos_requisicao" suffix="pontos"/>
            </div>
          </div>

          {/* Níveis */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faTrophy}/> Níveis de Gamificação</h2>
              <p className="text-xs text-ink/40 mt-1">Pontos necessários para o agente subir de nível. Bronze começa em 0 pontos e não é configurável.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prata" hint="Pontos mínimos" configKey="nivel_prata_min" suffix="pontos"/>
              <Field label="Ouro" hint="Pontos mínimos" configKey="nivel_ouro_min" suffix="pontos"/>
              <Field label="Diamante" hint="Pontos mínimos" configKey="nivel_diamante_min" suffix="pontos"/>
            </div>
          </div>

          {/* Redirecionamento */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faRightLeft}/> Redirecionamento de Atendimento</h2>
              <p className="text-xs text-ink/40 mt-1">Quando um admin/supervisor redireciona um atendimento para um agente, ele tem um prazo para responder.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prazo para responder" hint="A partir do redirecionamento" configKey="redirecionamento_prazo_minutos" suffix="minutos"/>
              <Field label="Bônus ao responder" hint="Além dos pontos normais" configKey="redirecionamento_bonus" suffix="pontos"/>
              <Field label="Penalidade se não responder" hint="Aplicada ao expirar o prazo" configKey="redirecionamento_penalidade" suffix="pontos"/>
            </div>
          </div>

          {/* Notificações */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faVolumeHigh}/> Notificações</h2>
                <p className="text-xs text-ink/40 mt-1">Som tocado ao receber uma mensagem de um grupo. Preferência salva neste navegador.</p>
              </div>
              <button
                onClick={() => setAtivo(!ativo)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${ativo ? 'bg-accent' : 'bg-ink/15'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-5' : ''}`}/>
              </button>
            </div>

            <div className={`flex flex-col gap-5 transition-opacity ${ativo ? '' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink">Som</label>
                <div className="flex items-center gap-2">
                  <select
                    value={som}
                    onChange={e => setSom(e.target.value)}
                    className="input-glass px-4 py-2.5 text-sm rounded-xl flex-1"
                  >
                    {Object.entries(SONS).map(([id, { label }]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => tocarNotificacao(som, volume)}
                    title="Testar som"
                    className="px-4 py-2.5 text-sm rounded-xl bg-ink/5 hover:bg-ink/10 text-ink transition-colors"
                  >
                    <FontAwesomeIcon icon={faPlay}/>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink">Volume</label>
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faVolumeXmark} className="text-ink/30 text-xs"/>
                  <input
                    type="range" min="0" max="1" step="0.05" value={volume}
                    onChange={e => setVolume(Number(e.target.value))}
                    onMouseUp={() => tocarNotificacao(som, volume)}
                    className="flex-1 accent-accent"
                  />
                  <FontAwesomeIcon icon={faVolumeHigh} className="text-ink/30 text-xs"/>
                  <span className="text-xs text-ink/40 w-9 text-right">{Math.round(volume * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Raio X */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faChartLine}/> Raio X</h2>
              <p className="text-xs text-ink/40 mt-1">Horário em que o painel do dia é zerado e recomeça a contagem.</p>
            </div>
            <Field label="Horário de atualização" hint="Os dados do Raio X reiniciam neste horário todos os dias" configKey="raiox_hora_reset" type="time"/>
          </div>

          {/* Google Agenda */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faGoogle}/> Google Agenda</h2>
              <p className="text-xs text-ink/40 mt-1">Autoriza o sistema a criar salas do Google Meet junto com os eventos dos treinamentos.</p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-ink/3 border border-ink/5">
              <div className="flex items-center gap-2 text-sm">
                <FontAwesomeIcon icon={faVideo} className={googleConectado ? 'text-accent' : 'text-ink/30'}/>
                {googleConectado === null ? 'Verificando…' : googleConectado ? 'Conta Google conectada — o Meet é criado automaticamente' : 'Nenhuma conta Google autorizada ainda'}
              </div>
              <button onClick={conectarGoogle} disabled={conectandoGoogle}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-black hover:opacity-90 disabled:opacity-50 flex-shrink-0">
                {conectandoGoogle ? 'Abrindo…' : googleConectado ? 'Reconectar' : 'Conectar'}
              </button>
            </div>
          </div>

          {/* Info sistema */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-ink"><FontAwesomeIcon icon={faCircleInfo}/> Sistema</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Versão', 'WPP Central v2.0'],
                ['Stack', 'Node.js + PostgreSQL'],
                ['Sessão WA', 'Persistida em volume'],
                ['Job SLA', 'Roda a cada 1 minuto'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-ink/30">{k}</span>
                  <span className="text-ink/70">{v}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
