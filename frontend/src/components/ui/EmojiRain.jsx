import React, { useMemo } from 'react'

export default function EmojiRain({ emoji = '👴', quantidade = 50 }) {
  const pecas = useMemo(() => Array.from({ length: quantidade }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duracao: 2.5 + Math.random() * 2,
    tamanho: 22 + Math.random() * 20,
    drift: (Math.random() - 0.5) * 140,
  })), [quantidade])

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
      {pecas.map(p => (
        <span key={p.id} style={{
          position: 'absolute',
          top: 0,
          left: `${p.left}%`,
          fontSize: p.tamanho,
          '--drift': `${p.drift}px`,
          animation: `emoji-rain-fall ${p.duracao}s linear ${p.delay}s forwards`,
        }}>{emoji}</span>
      ))}
    </div>
  )
}
