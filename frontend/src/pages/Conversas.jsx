import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import Highcharts from 'highcharts/esm/highcharts'
import 'highcharts/esm/highcharts-more'
import 'highcharts/esm/modules/solid-gauge'
import HighchartsReact from 'highcharts-react-official'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCommentDots, faMagnifyingGlass, faRightLeft, faClock, faCheck, faTriangleExclamation, faHourglassHalf } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore, useThemeStore } from '../stores/index.js'
import { PriorBadge, StatusBadge, StatCard } from '../components/ui/index.jsx'

function formatAguardando(minutos) {
  if (minutos == null || minutos < 0) return '—'
  if (minutos < 60) return `${minutos}min`
  const h = Math.floor(minutos / 60), m = minutos % 60
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`
  return `${Math.floor(h / 24)}d`
}

const NIVEL_INFO = {
  BOM:      { label: 'Indo bem',   cor: '#22c55e' },
  MEDIO:    { label: 'Mediano',    cor: '#f59e0b' },
  RUIM:     { label: 'Indo mal',   cor: '#ef4444' },
  SEM_DADOS: { label: 'Sem dados ainda', cor: '#8b8b9c' },
}

export default function Conversas() {
  const { authHeaders, user } = useAuthStore()
  const { theme } = useThemeStore()
  const { refreshKey } = useOutletContext()
  const navigate = useNavigate()
  const [atends, setAtends] = useState([])
  const [busca, setBusca] = useState('')
  const [stats, setStats] = useState(null)

  const load = useCallback(() => {
    if (!user?.id) return
    fetch(`/api/atendimentos?redirecionadoPendente=true&agenteId=${user.id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setAtends(Array.isArray(d) ? d : []))
      .catch(() => {})
    fetch('/api/atendimentos/stats/redirecionamentos', { headers: authHeaders() })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [user?.id])

  useEffect(() => { load() }, [load, refreshKey])

  const filtered = busca
    ? atends.filter(a => a.grupo?.nome?.toLowerCase().includes(busca.toLowerCase()))
    : atends

  const ink = theme === 'dark' ? '255,255,255' : '23,23,30'

  const porSemana = stats?.porSemana || []
  const barOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 260, style: { fontFamily: 'inherit' } },
    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: porSemana.map(s => new Date(s.semana).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
      lineColor: `rgba(${ink},0.08)`,
      tickColor: `rgba(${ink},0.08)`,
      labels: { style: { color: `rgba(${ink},0.4)`, fontSize: '11px' } }
    },
    yAxis: {
      title: { text: undefined },
      gridLineColor: `rgba(${ink},0.06)`,
      labels: { style: { color: `rgba(${ink},0.3)`, fontSize: '11px' } },
      allowDecimals: false
    },
    tooltip: {
      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
      borderColor: `rgba(${ink},0.1)`,
      borderRadius: 8,
      style: { color: `rgba(${ink},0.85)`, fontSize: '12px' },
      formatter: function () { return `Semana de ${this.x}<br/><b>${this.y}</b> redirecionado(s)` }
    },
    plotOptions: {
      column: { borderRadius: 4, color: '#a78bfa', pointPadding: 0.1, groupPadding: 0.15, borderWidth: 0 }
    },
    series: [{ name: 'Redirecionados', data: porSemana.map(s => s.total) }]
  }

  const nivel = stats?.nivel || 'SEM_DADOS'
  const { label: nivelLabel, cor: nivelCor } = NIVEL_INFO[nivel]
  const valorGauge = stats?.percentual ?? 0

  const gaugeOptions = {
    chart: { type: 'solidgauge', backgroundColor: 'transparent', height: 220, style: { fontFamily: 'inherit' } },
    title: { text: undefined },
    credits: { enabled: false },
    pane: {
      center: ['50%', '85%'],
      size: '150%',
      startAngle: -90,
      endAngle: 90,
      background: { backgroundColor: `rgba(${ink},0.06)`, innerRadius: '60%', outerRadius: '100%', shape: 'arc', borderWidth: 0 }
    },
    yAxis: {
      min: 0, max: 100,
      lineWidth: 0, tickWidth: 0, minorTickInterval: null,
      labels: { enabled: false },
      stops: [[0.4, '#ef4444'], [0.7, '#f59e0b'], [1, '#22c55e']]
    },
    series: [{
      data: [valorGauge],
      dataLabels: {
        format: stats?.percentual == null
          ? '<div style="text-align:center"><span style="font-size:14px;color:rgba(' + ink + ',0.3)">Sem dados</span></div>'
          : `<div style="text-align:center"><span style="font-size:26px;font-weight:700;color:rgba(${ink},0.9)">{y}%</span></div>`,
        useHTML: true,
        y: -20
      }
    }],
    tooltip: { enabled: false }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Coluna esquerda — conversas redirecionadas */}
      <div className="w-96 flex-shrink-0 flex flex-col h-full overflow-hidden" style={{ borderRight: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <div className="px-6 py-4 flex flex-col gap-3 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
          <div>
            <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faCommentDots} className="text-accent"/> Conversas</h1>
            <p className="text-xs text-ink/40">Atendimentos redirecionados para você</p>
          </div>
          <div className="relative">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 text-xs" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar grupo…"
              className="input-glass pl-9 pr-4 py-2 text-sm rounded-xl w-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            {!filtered.length && (
              <div className="text-center py-16 text-ink/20 text-sm">Nenhum atendimento redirecionado para você</div>
            )}
            {filtered.map(a => (
              <div key={a.id} onClick={() => navigate(`/conversar/${a.id}`)}
                className="glass rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:brightness-110 transition-all">
                {a.grupo?.logo && (
                  <img src={a.grupo.logo} alt={a.grupo.nome} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink truncate">{a.grupo?.nome}</span>
                    <span title="Redirecionado para você" className="inline-flex items-center justify-center w-4 h-4 bg-red-500/15 text-red-400 text-[9px] rounded-full flex-shrink-0">
                      <FontAwesomeIcon icon={faRightLeft} />
                    </span>
                  </div>
                  <div className="text-xs text-ink/40 truncate mt-0.5">
                    {a.ultimoRemetente ? <span className="text-ink/60 font-medium">{a.ultimoRemetente}: </span> : null}
                    {a.ultimaMsg || '(sem mensagens)'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <PriorBadge p={a.prioridade} />
                    <StatusBadge s={a.status} />
                  </div>
                </div>
                <span className="text-xs text-ink/40 flex items-center gap-1 flex-shrink-0">
                  <FontAwesomeIcon icon={faClock} />
                  {formatAguardando(a.minutosAberto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna direita — dashboard de desempenho */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-bold text-ink">Desempenho de redirecionamentos</h2>
          <p className="text-xs text-ink/40">Últimas 8 semanas</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label={<><FontAwesomeIcon icon={faCheck}/> Respondidos a tempo</>} value={stats?.respondidos ?? '—'} color="text-accent" />
          <StatCard label={<><FontAwesomeIcon icon={faTriangleExclamation}/> Expirados sem resposta</>} value={stats?.expirados ?? '—'} color="text-red-400" />
          <StatCard label={<><FontAwesomeIcon icon={faHourglassHalf}/> Pendentes agora</>} value={stats?.pendentesAtuais ?? '—'} color="text-amber-400" />
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          <div className="glass rounded-xl p-5 flex-[2] flex flex-col min-w-0">
            <h3 className="text-sm font-semibold text-ink mb-2">Redirecionados por semana</h3>
            {porSemana.some(s => s.total > 0) ? (
              <HighchartsReact highcharts={Highcharts} options={barOptions} />
            ) : (
              <div className="h-64 flex items-center justify-center text-ink/20 text-sm">Nenhum redirecionamento nas últimas 8 semanas</div>
            )}
          </div>

          <div className="glass rounded-xl p-5 flex-1 flex flex-col items-center min-w-0">
            <h3 className="text-sm font-semibold text-ink mb-2 self-start">Como você está indo</h3>
            <HighchartsReact highcharts={Highcharts} options={gaugeOptions} />
            <span className="text-sm font-semibold mt-1" style={{ color: nivelCor }}>{nivelLabel}</span>
            {stats?.percentual != null && (
              <span className="text-xs text-ink/40 mt-1 text-center">
                {stats.respondidos} de {stats.respondidos + stats.expirados} redirecionamentos respondidos dentro do prazo
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
