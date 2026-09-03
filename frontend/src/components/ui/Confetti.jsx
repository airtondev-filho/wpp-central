import React, { useMemo } from 'react'

const CORES = ['#a78bfa', '#facc15', '#34d399', '#f472b6', '#60a5fa', '#fb923c']

export default function Confetti({ quantidade = 80 }) {
  const pecas = useMemo(() => Array.from({ length: quantidade }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duracao: 2.5 + Math.random() * 1.5,
    cor: CORES[i % CORES.length],
    largura: 6 + Math.random() * 6,
    rotacao: Math.round(Math.random() * 360),
  })), [quantidade])

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
      {pecas.map(p => (
        <span key={p.id} style={{
          position: 'absolute',
          top: 0,
          left: `${p.left}%`,
          width: p.largura,
          height: p.largura * 0.4,
          backgroundColor: p.cor,
          borderRadius: 2,
          transform: `rotate(${p.rotacao}deg)`,
          animation: `confetti-fall ${p.duracao}s ease-in ${p.delay}s forwards`,
        }}/>
      ))}
    </div>
  )
}
