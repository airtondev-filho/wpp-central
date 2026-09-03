import React from 'react'
import { useToastStore } from '../../stores/index.js'

const ICONES = {
  sucesso: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  erro:    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  info:    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
}

const TITULOS = { sucesso: 'Sucesso', erro: 'Erro', info: 'Informação' }

const ESTILOS = {
  sucesso: 'border-green-500/40 bg-green-500/10 text-green-400',
  erro:    'border-red-500/40 bg-red-500/10 text-red-400',
  info:    'border-blue-500/40 bg-blue-500/10 text-blue-400',
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 right-5 z-[80] flex flex-col gap-3 w-96">
      {toasts.map(t => {
        const tipo = ESTILOS[t.tipo] ? t.tipo : 'info'
        return (
          <div key={t.id} role="alert"
            className={`rounded-md border p-4 shadow-sm animate-[fadeIn_0.2s_ease-out] ${ESTILOS[tipo]}`}>
            <div className="flex items-start gap-4">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth="1.5" stroke="currentColor" className="-mt-0.5 size-6 shrink-0">
                {ICONES[tipo]}
              </svg>
              <div className="flex-1 min-w-0">
                <strong className="block leading-tight font-medium">{TITULOS[tipo]}</strong>
                <p className="mt-0.5 text-sm opacity-80">{t.mensagem}</p>
              </div>
              <button onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100 text-xs leading-none flex-shrink-0 mt-1">
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
