import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faTriangleExclamation, faCircleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons'
import { temaMoldura, textoTitulo } from '../../utils/molduras.js'
import imgPrimeiroPasso from '../../assets/molduras/primeiro-passo.svg'
import imgVeterano from '../../assets/molduras/veterano-50.svg'
import imgCenturiao from '../../assets/molduras/centuriao-100.svg'
import imgApagadorIncendio from '../../assets/molduras/apagador-incendio.svg'
import imgRespostaRelampago from '../../assets/molduras/resposta-relampago.svg'
import imgNivelOuro from '../../assets/molduras/nivel-ouro.svg'
import imgNivelDiamante from '../../assets/molduras/nivel-diamante.svg'
import imgBannerPrimeiroPasso from '../../assets/banners/primeiro-passo.svg'
import imgBannerVeterano from '../../assets/banners/veterano-50.svg'
import imgBannerCenturiao from '../../assets/banners/centuriao-100.svg'
import imgBannerApagadorIncendio from '../../assets/banners/apagador-incendio.svg'
import imgBannerRespostaRelampago from '../../assets/banners/resposta-relampago.svg'
import imgBannerNivelOuro from '../../assets/banners/nivel-ouro.svg'
import imgBannerNivelDiamante from '../../assets/banners/nivel-diamante.svg'

const MOLDURA_IMAGEM = {
  primeiro_atendimento: imgPrimeiroPasso,
  veterano_50: imgVeterano,
  centuriao_100: imgCenturiao,
  apagador_incendio: imgApagadorIncendio,
  resposta_relampago: imgRespostaRelampago,
  nivel_ouro: imgNivelOuro,
  nivel_diamante: imgNivelDiamante,
}

// Arte de banner enviada pelo time — quando não houver uma pra um slug, cai no
// cartão com gradiente como reserva.
const BANNER_IMAGEM = {
  primeiro_atendimento: imgBannerPrimeiroPasso,
  veterano_50: imgBannerVeterano,
  centuriao_100: imgBannerCenturiao,
  apagador_incendio: imgBannerApagadorIncendio,
  resposta_relampago: imgBannerRespostaRelampago,
  nivel_ouro: imgBannerNivelOuro,
  nivel_diamante: imgBannerNivelDiamante,
}

// ── QR Modal ──────────────────────────────────────────────────────────────────
export function QRModal({ qr, onClose }) {
  return (
    <div className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', '--overlay-blur': '8px' }}
      onClick={onClose}>
      <div className="glass-strong rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-ink">Conectar WhatsApp</h2>
        {qr
          ? <img src={qr} alt="QR" className="w-64 h-64 rounded-xl bg-white p-3"/>
          : <div className="w-64 h-64 rounded-xl bg-ink/5 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-ink/20 border-t-accent rounded-full animate-spin"/>
            </div>
        }
        <p className="text-sm text-ink/40 text-center">
          WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
        </p>
        <button onClick={onClose} className="text-xs text-ink/30 hover:text-ink transition-colors">Fechar</button>
      </div>
    </div>
  )
}

// ── Priority Badge ────────────────────────────────────────────────────────────
export function PriorBadge({ p }) {
  const map = {
    NORMAL:  { cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',  icon: faCircleInfo,        label: 'Normal'  },
    ALTO:    { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: faTriangleExclamation, label: 'Alto'   },
    CRITICO: { cls: 'text-red-400 bg-red-400/10 border-red-400/20',      icon: faCircleExclamation, label: 'Crítico' },
  }
  const { cls, icon, label } = map[p] || map.NORMAL
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <FontAwesomeIcon icon={icon}/> {label}
    </span>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ s }) {
  const map = {
    ABERTO:             { cls: 'text-red-400 bg-red-400/10 border-red-400/20',    label: 'Aberto'             },
    EM_ATENDIMENTO:     { cls: 'text-accent bg-accent/10 border-accent/20',       label: 'Em atendimento'     },
    AGUARDANDO_CLIENTE: { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', label: 'Aguard. cliente' },
    FINALIZADO:         { cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: 'Finalizado'         },
  }
  const { cls, label } = map[s] || { cls: '', label: s }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>
}

// ── Tempo label ───────────────────────────────────────────────────────────────
export function TempoLabel({ minutos }) {
  if (!minutos || minutos <= 0) return <span className="text-xs text-ink/30">agora</span>
  const h = Math.floor(minutos / 60), d = Math.floor(h / 24)
  const txt = minutos < 60 ? `${minutos}min` : h < 24 ? `${h}h` : `${d}d`
  const cls = minutos < 10 ? 'text-accent' : minutos < 30 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs font-medium ${cls}`}>{txt}</span>
}

// ── Glass Card ────────────────────────────────────────────────────────────────
export function GlassCard({ children, className = '', prioridade }) {
  const glowCls = prioridade === 'CRITICO' ? 'card-critico'
                : prioridade === 'ALTO'    ? 'card-alto'
                : 'card-normal'
  return (
    <div className={`glass rounded-xl p-4 ${glowCls} ${className}`}>
      {children}
    </div>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 'max-w-md' }) {
  return (
    <div className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', '--overlay-blur': '6px' }}
      onClick={onClose}>
      <div className={`glass-strong rounded-2xl p-6 w-full max-h-[85vh] overflow-y-auto ${width}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink/30 hover:text-ink text-lg leading-none"><FontAwesomeIcon icon={faXmark}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Moldura (anel decorado com ícones em volta do avatar) ────────────────────
export function Moldura({ slug, size = 40, className = '', children }) {
  const tema = temaMoldura(slug)
  if (!tema) return className ? <div className={className}>{children}</div> : children

  const outer = size + 16
  const centro = outer / 2
  const raio = size / 2 + 5
  const n = size < 36 ? 0 : size < 56 ? 4 : 6
  const gradId = `moldura-${slug}-${size}`
  const imagem = MOLDURA_IMAGEM[slug]

  if (imagem) {
    return (
      <div className={`relative flex-shrink-0 ${className}`} style={{ width: outer, height: outer }}>
        <img src={imagem} alt="" className="absolute inset-0 w-full h-full pointer-events-none select-none" />
        <div className="absolute rounded-full overflow-hidden" style={{ inset: 8 }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: outer, height: outer }}>
      <svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`} className="absolute inset-0">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tema.cor} stopOpacity="0.45" />
            <stop offset="50%" stopColor={tema.cor} stopOpacity="1" />
            <stop offset="100%" stopColor={tema.cor} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <circle cx={centro} cy={centro} r={raio} fill="none" stroke={`url(#${gradId})`} strokeWidth={Math.max(2, size * 0.05)} />
      </svg>
      {Array.from({ length: n }).map((_, i) => {
        const angulo = (i / n) * 2 * Math.PI - Math.PI / 2
        const x = centro + raio * Math.cos(angulo)
        const y = centro + raio * Math.sin(angulo)
        const tam = size * 0.26
        return (
          <div key={i} className="absolute rounded-full flex items-center justify-center"
            style={{
              left: x, top: y, width: tam, height: tam,
              transform: 'translate(-50%,-50%)',
              background: 'var(--surface, #0b0b10)',
              boxShadow: `0 0 6px 1px ${tema.corSuave}`,
            }}>
            <FontAwesomeIcon icon={tema.icone} style={{ color: tema.cor, fontSize: size * 0.15 }} />
          </div>
        )
      })}
      <div className="absolute rounded-full" style={{ inset: 8, boxShadow: `0 0 10px 2px ${tema.corSuave}` }}>
        {children}
      </div>
    </div>
  )
}

// ── Título Badge (selo ganho num baú, exibido junto ao nome) ────────────────
export function TituloBadge({ slug, className = '' }) {
  const texto = textoTitulo(slug)
  const tema = temaMoldura(slug)
  if (!texto || !tema) return null
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${className}`}
      style={{ color: tema.cor, borderColor: `${tema.cor}55`, background: `${tema.cor}1a` }}>
      {texto}
    </span>
  )
}

// ── Banner (faixa de perfil ganha por badge ou missão) ───────────────────────
export function BannerPreview({ slug, nome, className = '' }) {
  const tema = temaMoldura(slug)
  if (!tema) return null
  const imagem = BANNER_IMAGEM[slug]
  return (
    <div className={`relative rounded-xl overflow-hidden flex items-center px-5 flex-shrink-0 ${className}`}
      style={imagem ? undefined : { background: `linear-gradient(120deg, ${tema.cor}30, ${tema.cor}08)`, border: `1px solid ${tema.cor}45` }}>
      {imagem
        ? <img src={imagem} alt="" className="absolute inset-0 w-full h-full object-cover" />
        : <FontAwesomeIcon icon={tema.icone} className="absolute -right-3 -bottom-3 text-6xl opacity-10" style={{ color: tema.cor }}/>
      }
      {nome && <span className="text-sm font-bold relative" style={{ color: imagem ? '#f3f5fe' : tema.cor }}>{nome}</span>}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, color = 'text-ink', sub }) {
  return (
    <div className="glass rounded-xl px-5 py-4 flex flex-col gap-1">
      <span className="text-xs text-ink/40 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value ?? '—'}</span>
      {sub && <span className="text-xs text-ink/30">{sub}</span>}
    </div>
  )
}

export default QRModal
