import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../../stores/index.js'

export default function NotificacaoBell({ refreshKey }) {
  const { authHeaders } = useAuthStore()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const painelRef = useRef(null)

  const carregar = () => fetch('/api/notificacoes', { headers: authHeaders() })
    .then(r => r.json())
    .then(d => { const lista = Array.isArray(d) ? d : []; setNotifs(lista); setNaoLidas(lista.length) })
    .catch(() => {})

  useEffect(() => { carregar() }, [refreshKey])

  useEffect(() => {
    const fora = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (painelRef.current?.contains(e.target)) return
      setAberto(false)
      setNotifs([])
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  const abrir = async () => {
    const proximo = !aberto
    if (proximo) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ left: rect.right + 8, bottom: window.innerHeight - rect.bottom })
    }
    setAberto(proximo)
    if (!proximo) setNotifs([])
    if (proximo && notifs.length) {
      // Marca como lidas no backend e zera o contador imediatamente, mas
      // mantém a lista visível enquanto o painel estiver aberto — assim o
      // usuário ainda consegue clicar nelas para navegar até a conversa.
      setNaoLidas(0)
      await fetch('/api/notificacoes/ler-todas', { method: 'PATCH', headers: authHeaders() })
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-2.5 mb-3">
      <button ref={btnRef} onClick={abrir}
        title="Notificações"
        className="relative flex items-center justify-center w-8 h-8 rounded-full text-white/50 hover:text-white/90 hover:bg-[#17171f] transition-colors flex-shrink-0">
        <FontAwesomeIcon icon={faBell} className="text-sm" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>
      <span className="max-w-0 group-hover:max-w-[10rem] overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap text-xs text-white/50">
        Notificações
      </span>

      {aberto && pos && createPortal(
        <div ref={painelRef}
          className="fixed w-72 max-h-96 overflow-y-auto rounded-xl bg-[#17171f] shadow-glass border border-white/5 z-50 p-2"
          style={{ left: pos.left, bottom: pos.bottom }}>
          {!notifs.length && (
            <div className="text-center py-6 text-white/30 text-xs">Nenhuma notificação nova</div>
          )}
          {notifs.map(n => (
            <div key={n.id}
              onClick={() => {
                if (!n.atendId) return
                setAberto(false)
                navigate(`/conversar/${n.atendId}`)
              }}
              className={`px-3 py-2.5 rounded-lg transition-colors ${n.atendId ? 'cursor-pointer hover:bg-white/5' : ''}`}>
              <div className="text-xs font-semibold text-white/90">{n.titulo}</div>
              {n.corpo && <div className="text-xs text-white/40 mt-0.5">{n.corpo}</div>}
              <div className="text-[10px] text-white/25 mt-1">{new Date(n.criadoEm).toLocaleString('pt-BR')}</div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
