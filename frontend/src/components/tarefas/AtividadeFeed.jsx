import React from 'react'

function rotuloDoDia(data) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1)
  const d = new Date(data); d.setHours(0, 0, 0, 0)

  if (d.getTime() === hoje.getTime()) return 'Hoje'
  if (d.getTime() === ontem.getTime()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function AtividadeFeed({ atividades }) {
  const grupos = []
  for (const a of atividades) {
    const rotulo = rotuloDoDia(a.criadoEm)
    let grupo = grupos.find(g => g.rotulo === rotulo)
    if (!grupo) { grupo = { rotulo, itens: [] }; grupos.push(grupo) }
    grupo.itens.push(a)
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs text-ink/40 uppercase tracking-wider">Atividade</h4>
      {grupos.map(g => (
        <div key={g.rotulo} className="flex flex-col gap-1.5">
          <span className="text-xs text-ink/30 font-semibold">{g.rotulo}</span>
          {g.itens.map(a => (
            <div key={a.id} className="text-xs text-ink/50 flex gap-2">
              <span className="text-ink/25 flex-shrink-0">{formatHora(a.criadoEm)}</span>
              <span>{a.descricao}</span>
            </div>
          ))}
        </div>
      ))}
      {!atividades.length && <p className="text-xs text-ink/20">Sem atividade registrada.</p>}
    </div>
  )
}
