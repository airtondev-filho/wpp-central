import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarCheck, faClock, faChartColumn, faCheckDouble, faTrophy, faBolt, faMedal, faChartLine } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore, useThemeStore } from '../stores/index.js'
import { StatCard, PriorBadge } from '../components/ui/index.jsx'

const MEDAL_CLS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

const NIVEIS_GAUGE = [
  { key: 'E', label: 'Crítico',   color: '#ef4444', min: 0  },
  { key: 'D', label: 'Atenção',   color: '#f87171', min: 20 },
  { key: 'C', label: 'Mediano',   color: '#fde047', min: 40 },
  { key: 'B', label: 'Bom',       color: '#fbbf24', min: 60 },
  { key: 'A', label: 'Excelente', color: '#4ade80', min: 80 },
]

// Combina a mistura de prioridades em aberto (60%) com o tempo médio de
// resposta frente ao SLA configurado (40%) num único placar de 0 a 100.
function calcularScoreGauge(stats, config) {
  if (!stats) return null
  const abertos = stats.abertos || 0
  const severidade = abertos > 0
    ? ((stats.normal || 0) * 90 + (stats.alto || 0) * 45 + (stats.critico || 0) * 0) / abertos
    : 100

  const slaNormal = Number(config?.sla_normal) || 10
  const slaAlto = Number(config?.sla_alto) || 30
  let tempo = null
  if (stats.tempoMedioResposta > 0) {
    if (stats.tempoMedioResposta <= slaNormal) tempo = 100
    else if (stats.tempoMedioResposta >= slaAlto) tempo = 0
    else tempo = 100 - ((stats.tempoMedioResposta - slaNormal) / (slaAlto - slaNormal)) * 100
  }

  const score = tempo !== null ? severidade * 0.6 + tempo * 0.4 : severidade
  return Math.round(Math.max(0, Math.min(100, score)))
}

function nivelDoScore(score) {
  return [...NIVEIS_GAUGE].reverse().find(n => score >= n.min) || NIVEIS_GAUGE[0]
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = angleDeg * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function PerformanceGauge({ score }) {
  const cx = 150, cy = 148, rOuter = 128, rInner = 78
  const segAngles = [180, 144, 108, 72, 36, 0]

  const nivel = nivelDoScore(score ?? 0)
  const agulhaAngulo = 180 - Math.max(0, Math.min(100, score ?? 0)) * 1.8
  const ponta = polarToCartesian(cx, cy, rOuter - 14, agulhaAngulo)

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full flex justify-center mt-6">
      <svg viewBox="0 0 300 165" className="w-80 max-w-full">
        {NIVEIS_GAUGE.map((n, i) => {
          const start = segAngles[i], end = segAngles[i + 1]
          const p1 = polarToCartesian(cx, cy, rOuter, start)
          const p2 = polarToCartesian(cx, cy, rOuter, end)
          const p3 = polarToCartesian(cx, cy, rInner, end)
          const p4 = polarToCartesian(cx, cy, rInner, start)
          const mid = (start + end) / 2
          const lp = polarToCartesian(cx, cy, (rOuter + rInner) / 2, mid)
          return (
            <g key={n.key}>
              <path
                d={`M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`}
                fill={n.color} stroke="var(--surface)" strokeWidth="2"
              />
              <text x={lp.x} y={lp.y} textAnchor="middle" fontSize="15" fontWeight="600" fill="#171717">
                {n.key}
              </text>
            </g>
          )
        })}
        <path d={`M ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 0 1 ${cx + rInner} ${cy} Z`} fill="rgb(var(--ink-rgb) / 8%)" />
        <line x1={cx} y1={cy} x2={ponta.x} y2={ponta.y} stroke="rgb(var(--ink-rgb))" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="7" fill="rgb(var(--ink-rgb))" />
      </svg>
      </div>
      <div className="text-center -mt-1">
        <div className="text-lg font-bold" style={{ color: nivel.color }}>Nível {nivel.key} — {nivel.label}</div>
        <div className="text-xs text-ink/40">{score ?? '—'} de 100</div>
      </div>
    </div>
  )
}

const PERIODOS_VOLUME = [
  { key: 'hoje',         label: 'Hoje' },
  { key: '7d',           label: '7 dias' },
  { key: '30d',          label: '30 dias' },
  { key: '3m',           label: '3 meses' },
  { key: 'personalizado', label: 'Personalizado' },
]

function hojeISO(offsetDias = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

export default function Dashboard() {
  const { authHeaders } = useAuthStore()
  const { theme } = useThemeStore()
  const { refreshKey } = useOutletContext()
  const [stats, setStats] = useState(null)
  const [atends, setAtends] = useState([])
  const [config, setConfig] = useState(null)

  const [periodoVolume, setPeriodoVolume] = useState('7d')
  const [volumeDe, setVolumeDe] = useState(hojeISO(-7))
  const [volumeAte, setVolumeAte] = useState(hojeISO(0))
  const [seriesVisiveis, setSeriesVisiveis] = useState({ recebidos: true, resolvidos: true })
  const [volumeData, setVolumeData] = useState(null)

  const load = async () => {
    const [s, a, c] = await Promise.all([
      fetch('/api/stats',        { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/atendimentos?status=ABERTO,EM_ATENDIMENTO,AGUARDANDO_CLIENTE', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/config',       { headers: authHeaders() }).then(r => r.json()).catch(() => null),
    ])
    setStats(s)
    setAtends(Array.isArray(a) ? a : [])
    setConfig(c)
  }

  const loadVolume = async () => {
    if (periodoVolume === 'personalizado' && (!volumeDe || !volumeAte)) return
    const params = new URLSearchParams({ periodo: periodoVolume })
    if (periodoVolume === 'personalizado') { params.set('de', volumeDe); params.set('ate', volumeAte) }
    const data = await fetch(`/api/stats/volume?${params}`, { headers: authHeaders() }).then(r => r.json())
    setVolumeData(data)
  }

  useEffect(() => { load() }, [refreshKey])
  useEffect(() => { loadVolume() }, [refreshKey, periodoVolume, volumeDe, volumeAte])

  const gaugeScore = calcularScoreGauge(stats, config)

  const toggleSerie = key => setSeriesVisiveis(prev => {
    const next = { ...prev, [key]: !prev[key] }
    return (next.recebidos || next.resolvidos) ? next : prev
  })

  const grafico = (stats?.por_dia || []).map(h => ({
    dia: new Date(h.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    total: Number(h.total)
  }))

  const ink = theme === 'dark' ? '255,255,255' : '23,23,30'

  const barOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 320, style: { fontFamily: 'inherit' } },
    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: grafico.map(g => g.dia),
      lineColor: `rgba(${ink},0.08)`,
      tickColor: `rgba(${ink},0.08)`,
      labels: { style: { color: `rgba(${ink},0.4)`, fontSize: '11px' } }
    },
    yAxis: {
      title: { text: undefined },
      gridLineColor: `rgba(${ink},0.06)`,
      labels: { enabled: false },
      minorGridLineWidth: 0,
      allowDecimals: false
    },
    tooltip: {
      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
      borderColor: `rgba(${ink},0.1)`,
      borderRadius: 8,
      style: { color: `rgba(${ink},0.85)`, fontSize: '12px' }
    },
    plotOptions: {
      column: { borderRadius: 4, color: '#a78bfa', pointPadding: 0.1, groupPadding: 0.1, borderWidth: 0 }
    },
    series: [{ name: 'Atendimentos', data: grafico.map(g => g.total) }]
  }

  const volumeCategorias = (volumeData?.pontos || []).map(p => {
    const d = new Date(p.bucket)
    if (volumeData.granularidade === 'hora') return d.toLocaleTimeString('pt-BR', { hour: '2-digit' })
    if (volumeData.granularidade === 'semana') return `sem ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  })

  const volumeSeries = [
    seriesVisiveis.recebidos && { name: 'Recebidos', color: '#a78bfa', data: (volumeData?.pontos || []).map(p => p.recebidos) },
    seriesVisiveis.resolvidos && { name: 'Resolvidos', color: '#4ade80', data: (volumeData?.pontos || []).map(p => p.resolvidos) },
  ].filter(Boolean)

  const volumeOptions = {
    chart: { type: 'areaspline', backgroundColor: 'transparent', height: 320, style: { fontFamily: 'inherit' } },
    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: volumeCategorias,
      lineColor: `rgba(${ink},0.08)`,
      tickColor: `rgba(${ink},0.08)`,
      labels: { style: { color: `rgba(${ink},0.4)`, fontSize: '11px' } }
    },
    yAxis: {
      title: { text: undefined },
      gridLineColor: `rgba(${ink},0.06)`,
      labels: { style: { color: `rgba(${ink},0.4)`, fontSize: '11px' } },
      minorGridLineWidth: 0,
      allowDecimals: false
    },
    tooltip: {
      shared: true,
      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
      borderColor: `rgba(${ink},0.1)`,
      borderRadius: 8,
      style: { color: `rgba(${ink},0.85)`, fontSize: '12px' }
    },
    plotOptions: {
      areaspline: { fillOpacity: 0.15, lineWidth: 2, marker: { enabled: false } }
    },
    series: volumeSeries
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink">Dashboard</h1>
        <p className="text-xs text-ink/40 mt-0.5">Visão geral em tempo real</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label={<><FontAwesomeIcon icon={faCalendarCheck}/> Total geral</>} value={stats?.totalAtendimentos} color="text-accent" sub="todos os status, todo o período" />
          <StatCard label={<><FontAwesomeIcon icon={faClock}/> Tempo médio até 1ª resposta</>}  value={stats?.tempoMedioResposta ? `${stats.tempoMedioResposta}min` : '—'} />
          <StatCard label={<><FontAwesomeIcon icon={faChartColumn}/> Abertos agora</>}         value={stats?.abertos} />
          <StatCard label={<><FontAwesomeIcon icon={faCheckDouble}/> Total finalizados</>}      value={stats?.finalizados} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Gráfico */}
          <div className="glass rounded-xl p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-ink mb-4">Atendimentos por dia (histórico completo)</h3>
            <div className="mt-auto">
              {grafico.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={barOptions} />
              ) : (
                <div className="h-80 flex items-center justify-center text-ink/20 text-sm">Sem dados ainda</div>
              )}
            </div>
          </div>

          {/* Ranking rápido */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink mb-4"><FontAwesomeIcon icon={faTrophy}/> Top agentes</h3>
            <div className="flex flex-col gap-2.5">
              {(stats?.ranking || []).map((a, i) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">
                    {i < 3 ? <FontAwesomeIcon icon={faMedal} className={MEDAL_CLS[i]}/> : `#${i+1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-ink truncate">{a.nome}</span>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.5 flex-shrink-0">{a.nivel}</span>
                    </div>
                    <div className="h-1.5 bg-ink/5 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((a.total / (stats.ranking[0]?.total || 1)) * 100)}%` }}/>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-accent">{a.total}</span>
                </div>
              ))}
              {!stats?.ranking?.length && <div className="text-ink/20 text-sm text-center py-4">Sem dados</div>}
            </div>
          </div>
        </div>

        {/* Como você está indo + Volume de atendimentos */}
        <div className="grid grid-cols-2 gap-5">
          <div className="glass rounded-xl p-3 flex flex-col items-center w-full">
            <h3 className="text-xs font-semibold text-ink mb-1 self-start">Como você está indo</h3>
            <PerformanceGauge score={gaugeScore} />
            <p className="text-[11px] text-ink/40 text-center mt-1">
              {stats?.critico || 0} crítico(s), {stats?.alto || 0} alto(s) e {stats?.normal || 0} normal(is) em aberto · tempo médio até 1ª resposta {stats?.tempoMedioResposta ? `${stats.tempoMedioResposta}min` : '—'}
            </p>
          </div>

          <div className="glass rounded-xl p-5 flex flex-col">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <h3 className="text-sm font-semibold text-ink"><FontAwesomeIcon icon={faChartLine}/> Volume de atendimentos</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-ink/5 rounded-xl p-1">
                  {PERIODOS_VOLUME.map(p => (
                    <button key={p.key} onClick={() => setPeriodoVolume(p.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        periodoVolume === p.key ? 'bg-violet-500/15 text-violet-200 border border-violet-500/30' : 'text-ink/40 hover:text-ink/70'
                      }`}>{p.label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-ink/5 rounded-xl p-1">
                  {[{ key: 'recebidos', label: 'Recebidos', color: '#a78bfa' }, { key: 'resolvidos', label: 'Resolvidos', color: '#4ade80' }].map(s => (
                    <button key={s.key} onClick={() => toggleSerie(s.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        seriesVisiveis[s.key] ? 'text-ink' : 'text-ink/30'
                      }`}>
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color, opacity: seriesVisiveis[s.key] ? 1 : 0.3 }}/>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {periodoVolume === 'personalizado' && (
              <div className="flex items-center gap-2 mb-3">
                <input type="date" value={volumeDe} onChange={e => setVolumeDe(e.target.value)}
                  className="input-glass px-3 py-1.5 text-xs rounded-lg" />
                <span className="text-ink/30 text-xs">até</span>
                <input type="date" value={volumeAte} onChange={e => setVolumeAte(e.target.value)}
                  className="input-glass px-3 py-1.5 text-xs rounded-lg" />
              </div>
            )}

            {volumeSeries.length > 0 && volumeCategorias.length > 0 ? (
              <HighchartsReact highcharts={Highcharts} options={volumeOptions} />
            ) : (
              <div className="h-80 flex items-center justify-center text-ink/20 text-sm">Sem dados no período</div>
            )}
          </div>
        </div>

        {/* Atendimentos críticos/altos recentes */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-4"><FontAwesomeIcon icon={faBolt}/> Atendimentos urgentes</h3>
          <div className="flex flex-col gap-2">
            {atends.filter(a => a.prioridade !== 'NORMAL').map(a => (
              <div key={a.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-ink/3 border border-ink/5">
                <PriorBadge p={a.prioridade}/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{a.grupo?.nome}</div>
                  <div className="text-xs text-ink/40 truncate">{a.ultimaMsg}</div>
                </div>
                <div className="text-xs text-ink/30">{a.minutosAberto}min</div>
              </div>
            ))}
            {atends.filter(a => a.prioridade !== 'NORMAL').length === 0 && (
              <div className="text-ink/20 text-sm text-center py-6"><FontAwesomeIcon icon={faCheckDouble}/> Nenhum atendimento urgente</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
