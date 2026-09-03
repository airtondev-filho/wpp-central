import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

// Fixed star field so positions don't reshuffle on every re-render.
const STARS = Array.from({ length: 60 }, (_, i) => ({
  top: (i * 37 + (i % 7) * 11) % 100,
  left: (i * 53 + (i % 5) * 17) % 100,
  size: (i % 3) + 1,
  delay: (i % 10) * 0.4,
}))

// Pine-tree silhouette row along the foreground ridge.
const TREES = [
  { x: 40,  h: 60 }, { x: 90,  h: 80 }, { x: 130, h: 55 }, { x: 190, h: 90 },
  { x: 240, h: 65 }, { x: 470, h: 70 }, { x: 520, h: 95 }, { x: 570, h: 60 },
  { x: 700, h: 75 }, { x: 750, h: 55 },
]

function Tree({ x, h }) {
  const w = h * 0.55
  return (
    <g transform={`translate(${x}, ${300 - h})`} fill="#0d0620">
      <polygon points={`${w/2},0 0,${h*0.45} ${w},${h*0.45}`}/>
      <polygon points={`${w/2},${h*0.18} ${w*0.08},${h*0.7} ${w*0.92},${h*0.7}`}/>
      <rect x={w/2 - w*0.06} y={h*0.7} width={w*0.12} height={h*0.3}/>
    </g>
  )
}

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-screen flex" style={{
      background: '#08080b',
      // Telas de autenticação usam sempre o cenário noturno — não seguem o
      // toggle de tema (não há toggle visível antes do login).
      '--bg': '#13131b', '--surface': '#17171f', '--surface-strong': '#1a1a23',
      '--shadow-dark': 'rgba(0,0,0,0.65)', '--shadow-dark-soft': 'rgba(0,0,0,0.45)',
      '--shadow-light': 'rgba(255,255,255,0.045)', '--border': 'rgba(255,255,255,0.04)',
      '--text': '#f0f0f8', '--muted': 'rgba(255,255,255,0.4)', '--ink-rgb': '240 240 248',
    }}>
      {/* LEFT: form (fixed width so the visual on the right gets most of the screen) */}
      <div className="w-full lg:w-[800px] flex-shrink-0 flex flex-col justify-center pl-20 pr-8 sm:pl-32 sm:pr-10 py-12 relative z-10">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faWhatsapp} className="text-white text-base"/>
            </div>
            <span className="text-sm font-bold text-white">WPP Central</span>
          </div>

          {eyebrow && <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold mb-2">{eyebrow}</p>}
          <h1 className="text-4xl font-bold text-white mb-2">
            {title}<span className="text-violet-400">.</span>
          </h1>
          {subtitle && <p className="text-sm text-white/40 mb-8">{subtitle}</p>}

          {children}
        </div>

        <p className="text-xs text-white/20 mt-12 lg:mt-16">WPP Central v2.0</p>
      </div>

      {/* RIGHT: hero visual — takes the remaining (larger) share of the screen */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, #0b0620 0%, #1c0f3a 45%, #241a42 100%)'
        }}/>

        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`, left: `${s.left}%`,
              width: s.size, height: s.size,
              opacity: 0.15 + (s.size * 0.15),
              animation: `twinkle 3s ease-in-out ${s.delay}s infinite`
            }}/>
        ))}

        <div className="absolute meteor" style={{ top: '18%', left: '55%' }}/>

        {/* Moon */}
        <div className="absolute rounded-full" style={{
          top: '9%', right: '16%', width: 76, height: 76,
          background: 'radial-gradient(circle at 38% 35%, #fbf6ff 0%, #ded0f5 55%, #b9a4e0 100%)',
          boxShadow: '0 0 70px 22px rgba(196,168,255,0.3)'
        }}>
          <div className="absolute rounded-full" style={{ top: '28%', left: '20%', width: 10, height: 10, background: 'rgba(150,130,190,0.35)' }}/>
          <div className="absolute rounded-full" style={{ top: '55%', left: '55%', width: 14, height: 14, background: 'rgba(150,130,190,0.3)' }}/>
          <div className="absolute rounded-full" style={{ top: '60%', left: '25%', width: 6, height: 6, background: 'rgba(150,130,190,0.3)' }}/>
        </div>

        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 800 300" preserveAspectRatio="none" style={{ height: '45%' }}>
          <polygon points="0,300 0,180 180,60 320,160 420,90 560,190 650,120 800,200 800,300" fill="#160a2c" opacity="0.9"/>
          <polygon points="0,300 0,220 150,140 300,210 460,150 620,230 800,170 800,300" fill="#1e1038"/>
          {TREES.map((t, i) => <Tree key={i} {...t}/>)}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 px-10 text-center">
          <FontAwesomeIcon icon={faWhatsapp} className="text-violet-300/80 text-2xl mb-3"/>
          <p className="text-white/70 text-sm max-w-xs">
            Atendimento organizado, prioridades sob controle, tudo em tempo real.
          </p>
        </div>

        {/* Fade the image into the dark panel instead of a hard seam near the form */}
        <div className="absolute inset-y-0 left-0 w-1/3" style={{
          background: 'linear-gradient(to right, #08080b 0%, rgba(8,8,11,0.7) 45%, transparent 100%)'
        }}/>
      </div>
    </div>
  )
}
