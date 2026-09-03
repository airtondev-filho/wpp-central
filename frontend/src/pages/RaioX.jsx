import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInbox, faSpinner, faCheckDouble, faLayerGroup, faTrophy, faMedal, faFilePdf } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore, useThemeStore } from '../stores/index.js'
import { StatCard } from '../components/ui/index.jsx'

const MEDAL_CLS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

export default function RaioX() {
  const { authHeaders } = useAuthStore()
  const { theme } = useThemeStore()
  const { refreshKey } = useOutletContext()
  const [dados, setDados] = useState(null)
  const [baixando, setBaixando] = useState(false)

  const load = async () => {
    const d = await fetch('/api/raiox', { headers: authHeaders() }).then(r => r.json())
    setDados(d)
  }

  useEffect(() => { load() }, [refreshKey])

  const baixarPDF = async () => {
    setBaixando(true)
    try {
      const resp = await fetch('/api/raiox/pdf', { headers: authHeaders() })
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raio-x-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setBaixando(false)
    }
  }

  const grafico = (dados?.porHora || []).map(h => ({
    hora: new Date(h.hora).getHours() + 'h',
    total: h.total
  }))

  const pct = (n) => dados?.total ? Math.round((n / dados.total) * 100) : 0

  const ink = theme === 'dark' ? '255,255,255' : '23,23,30'

  const barOptions = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: grafico.map(g => g.hora),
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-5 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <div>
          <h1 className="text-lg font-bold text-ink">Raio X do dia</h1>
          <p className="text-xs text-ink/40 mt-0.5">Panorama dos atendimentos abertos hoje</p>
        </div>
        <button
          onClick={baixarPDF}
          disabled={baixando || !dados}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-accent border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FontAwesomeIcon icon={faFilePdf}/> {baixando ? 'Gerando…' : 'Baixar PDF'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label={<><FontAwesomeIcon icon={faLayerGroup}/> Realizados hoje</>} value={dados?.total} />
          <StatCard label={<><FontAwesomeIcon icon={faCheckDouble}/> Finalizados</>}    value={dados?.finalizado} color="text-blue-400"  sub={`${pct(dados?.finalizado)}% do total`} />
          <StatCard label={<><FontAwesomeIcon icon={faSpinner}/> Em andamento</>}       value={dados?.andamento}  color="text-accent"    sub={`${pct(dados?.andamento)}% do total`} />
          <StatCard label={<><FontAwesomeIcon icon={faInbox}/> Em aberto</>}            value={dados?.aberto}     color="text-red-400"   sub={`${pct(dados?.aberto)}% do total`} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label={<><FontAwesomeIcon icon={faCheckDouble}/> Grupos fechados</>}    value={dados?.gruposFechados}  color="text-blue-400" />
          <StatCard label={<><FontAwesomeIcon icon={faSpinner}/> Grupos em andamento</>}    value={dados?.gruposAndamento} color="text-accent" />
          <StatCard label={<><FontAwesomeIcon icon={faInbox}/> Grupos em aberto</>}         value={dados?.gruposAbertos}   color="text-red-400" />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Volume por hora (hoje)</h3>
            {grafico.length > 0 ? (
              <HighchartsReact highcharts={Highcharts} options={barOptions} />
            ) : (
              <div className="h-48 flex items-center justify-center text-ink/20 text-sm">Nenhum atendimento hoje ainda</div>
            )}
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Distribuição de status</h3>
            <div className="flex flex-col gap-4 justify-center h-[200px]">
              {[
                { label: 'Finalizados',  value: dados?.finalizado, cls: 'bg-blue-400' },
                { label: 'Em andamento', value: dados?.andamento,  cls: 'bg-accent' },
                { label: 'Em aberto',    value: dados?.aberto,     cls: 'bg-red-400' },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs text-ink/50 mb-1.5">
                    <span>{row.label}</span>
                    <span className="font-semibold text-ink/80">{row.value ?? 0}</span>
                  </div>
                  <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${row.cls}`} style={{ width: `${pct(row.value)}%` }}/>
                  </div>
                </div>
              ))}
              {!dados?.total && <div className="text-ink/20 text-sm text-center">Sem dados ainda</div>}
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-4"><FontAwesomeIcon icon={faLayerGroup}/> Status dos atendimentos por grupo</h3>
          <div className="flex flex-col gap-2.5">
            {(dados?.porGrupo || []).slice(0, 10).map(g => (
              <div key={g.jid} className="flex items-center gap-3">
                <div className="flex-1 min-w-0 text-sm text-ink truncate">{g.nome}</div>
                <span className="text-xs font-semibold text-red-400 w-16 text-right">{g.aberto} aberto</span>
                <span className="text-xs font-semibold text-accent w-20 text-right">{g.andamento} andam.</span>
                <span className="text-xs font-semibold text-blue-400 w-20 text-right">{g.finalizado} fechado</span>
              </div>
            ))}
            {!dados?.porGrupo?.length && <div className="text-ink/20 text-sm text-center py-4">Sem dados</div>}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-4"><FontAwesomeIcon icon={faTrophy}/> Agentes que mais atenderam hoje</h3>
          <div className="flex flex-col gap-2.5">
            {(dados?.ranking || []).slice(0, 5).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">
                  {i < 3 ? <FontAwesomeIcon icon={faMedal} className={MEDAL_CLS[i]}/> : `#${i+1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">{a.nome}</div>
                  <div className="h-1.5 bg-ink/5 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((a.total / (dados.ranking[0]?.total || 1)) * 100)}%` }}/>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent">{a.total}</span>
              </div>
            ))}
            {!dados?.ranking?.length && <div className="text-ink/20 text-sm text-center py-4">Sem dados</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
