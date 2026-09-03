// ── Ranking.jsx ───────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrophy, faCircleExclamation, faCheckDouble, faCalendarDay, faMedal } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { StatCard, Moldura, TituloBadge } from '../components/ui/index.jsx'

const MEDAL_CLS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

export default function Ranking() {
  const { authHeaders } = useAuthStore()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/stats', { headers: authHeaders() }).then(r => r.json()).then(setStats)
  }, [])

  const max = stats?.ranking?.[0]?.total || 1
  const top3 = stats?.ranking?.slice(0, 3) || []
  const resto = stats?.ranking?.slice(3) || []

  const PODIO_ORDEM = [1, 0, 2] // 2º, 1º, 3º
  const PODIO_CLS = [
    { alturaCls: 'h-28', pedestalCls: 'bg-gradient-to-b from-yellow-400/25 to-yellow-400/5 border border-yellow-400/30', avatarCls: 'w-20 h-20 text-2xl ring-2 ring-yellow-400', avatarPx: 80, numeroCls: 'text-yellow-400' },
    { alturaCls: 'h-24', pedestalCls: 'bg-gradient-to-b from-slate-300/20 to-slate-300/5 border border-slate-300/25', avatarCls: 'w-16 h-16 text-lg ring-2 ring-slate-300', avatarPx: 64, numeroCls: 'text-slate-300' },
    { alturaCls: 'h-20', pedestalCls: 'bg-gradient-to-b from-amber-600/20 to-amber-600/5 border border-amber-600/25', avatarCls: 'w-16 h-16 text-lg ring-2 ring-amber-600', avatarPx: 64, numeroCls: 'text-amber-600' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faTrophy}/> Ranking de Atendimentos</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label={<><FontAwesomeIcon icon={faCircleExclamation}/> Em aberto</>} value={stats?.abertos} color="text-red-400" />
          <StatCard label={<><FontAwesomeIcon icon={faCheckDouble}/> Finalizados</>} value={stats?.finalizados} color="text-accent" />
          <StatCard label={<><FontAwesomeIcon icon={faCalendarDay}/> Hoje</>} value={stats?.hojeCount} color="text-blue-400" />
        </div>

        {/* Pódio top 3 */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-6 pt-6 pb-2">
            {PODIO_ORDEM.map((posicao) => {
              const a = top3[posicao]
              if (!a) return null
              const cls = PODIO_CLS[posicao]
              return (
                <div key={a.id} className="flex flex-col items-center w-32">
                  <FontAwesomeIcon icon={faMedal} className={`text-xl mb-1 ${MEDAL_CLS[posicao]}`}/>
                  <Moldura slug={a.molduraEquipada} size={cls.avatarPx} className="mb-2">
                    <div className={`rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent flex-shrink-0 overflow-hidden ${cls.avatarCls}`}>
                      {a.avatar ? <img src={a.avatar} alt={a.nome} className="w-full h-full object-cover" /> : a.nome.charAt(0).toUpperCase()}
                    </div>
                  </Moldura>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-sm text-ink truncate max-w-[7rem]">{a.nome}</span>
                    {a.online && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0"/>}
                  </div>
                  <div className="flex items-center gap-1 mb-2 flex-wrap justify-center">
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.5">{a.nivel}</span>
                    {a.tituloEquipado && <TituloBadge slug={a.tituloEquipado}/>}
                  </div>
                  <div className={`w-full rounded-t-xl flex items-center justify-center ${cls.alturaCls} ${cls.pedestalCls}`}>
                    <div className="text-center leading-tight">
                      <div className={`text-2xl font-black ${cls.numeroCls}`}>{posicao + 1}º</div>
                      <div className="text-base font-bold text-ink">{a.total}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Demais colocados */}
        <div className="flex flex-col gap-3">
          {resto.map((a, i) => (
            <div key={a.id} className="glass rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="text-2xl w-8 text-center">
                <span className="text-ink/30 text-base">#{i + 4}</span>
              </div>
              <Moldura slug={a.molduraEquipada} size={40}>
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0 overflow-hidden">
                  {a.avatar ? <img src={a.avatar} alt={a.nome} className="w-full h-full object-cover" /> : a.nome.charAt(0).toUpperCase()}
                </div>
              </Moldura>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-ink">{a.nome}</span>
                  {a.online && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0"/>}
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.5">{a.nivel}</span>
                  {a.tituloEquipado && <TituloBadge slug={a.tituloEquipado}/>}
                </div>
                <div className="h-1.5 bg-ink/5 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-700"
                       style={{ width: `${Math.round((a.total / max) * 100)}%` }}/>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-accent">{a.total}</div>
                <div className="text-xs text-ink/30">atendimentos</div>
              </div>
            </div>
          ))}
          {!stats?.ranking?.length && <div className="text-center py-16 text-ink/20 text-sm">Nenhum atendimento registrado</div>}
        </div>
      </div>
    </div>
  )
}
