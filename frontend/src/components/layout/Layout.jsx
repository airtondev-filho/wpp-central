import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGaugeHigh, faXRay, faHeadset, faClipboardList, faClipboardCheck, faGraduationCap, faCalendarDays, faComments, faCommentDots, faTrophy, faAward, faUsers, faRobot, faGear, faArrowRightFromBracket, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore, useWAStore, useThemeStore } from '../../stores/index.js'
import { useSocket } from '../../hooks/useSocket.js'
import { useProximidadeInicio } from '../../hooks/useProximidadeInicio.js'
import QRModal, { Moldura, TituloBadge } from '../ui/index.jsx'
import GamificacaoToastContainer from '../ui/GamificacaoToast.jsx'
import ToastContainer from '../ui/ToastContainer.jsx'
import logoIcon from '../../assets/logo-icon.png'

// Componente "sentinela": não renderiza nada visível, só observa se este
// treinamento específico está próximo do início (e dispara o som/alerta),
// reportando o resultado para o Layout — assim o alerta funciona em
// qualquer tela (ex.: Central de Atendimento), não só na de Treinamentos.
function TreinamentoProximidadeSentinela({ t, onChange }) {
  const proximo = useProximidadeInicio(t)
  useEffect(() => { onChange(t.id, proximo) }, [t.id, proximo, onChange])
  useEffect(() => () => onChange(t.id, false), [t.id, onChange])
  return null
}

const nav = [
  { to: '/',             icon: faGaugeHigh,  label: 'Dashboard',      roles: null },
  { to: '/raio-x',       icon: faXRay,       label: 'Raio X',         roles: null },
  { to: '/central',      icon: faHeadset,    label: 'Central',        roles: null },
  { to: '/conversas',    icon: faCommentDots, label: 'Conversas',      roles: null },
  { to: '/tarefas',      icon: faClipboardList, label: 'Tarefas',     roles: null },
  { to: '/treinamentos', icon: faGraduationCap, label: 'Treinamentos', roles: null },
  { to: '/agenda',       icon: faCalendarDays, label: 'Agenda',        roles: null },
  { to: '/grupos',       icon: faComments,   label: 'Grupos',         roles: null },
  { to: '/requisicoes',  icon: faClipboardCheck, label: 'Requisições', roles: null },
  { to: '/ranking',      icon: faTrophy,     label: 'Ranking',        roles: null },
  { to: '/conquistas',   icon: faAward,      label: 'Conquistas',     roles: null },
  { to: '/agentes',      icon: faUsers,      label: 'Agentes',        roles: ['ADMIN','SUPERVISOR','AGENTE'] },
  { to: '/automacao',    icon: faRobot,      label: 'Automações',     roles: ['ADMIN'] },
  { to: '/configuracoes',icon: faGear,       label: 'Configurações',  roles: ['ADMIN','SUPERVISOR'] },
]

export default function Layout() {
  const { user, logout, uploadAvatar, authHeaders } = useAuthStore()
  const { connected, qr } = useWAStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [showQR, setShowQR] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [notifKey, setNotifKey] = useState(0)
  const [reqKey, setReqKey] = useState(0)
  const [reqCount, setReqCount] = useState(0)
  const [conversasCount, setConversasCount] = useState(0)
  const [enviandoAvatar, setEnviandoAvatar] = useState(false)
  const [treinamentosAgendados, setTreinamentosAgendados] = useState([])
  const [treinamentosProximos, setTreinamentosProximos] = useState(() => new Set())

  useSocket(() => setRefreshKey(k => k + 1), () => setNotifKey(k => k + 1), () => setReqKey(k => k + 1))

  useEffect(() => {
    fetch('/api/treinamentos', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setTreinamentosAgendados(Array.isArray(d) ? d.filter(t => t.data && ['AGENDADO', 'PLANEJADO'].includes(t.status)) : []))
      .catch(() => {})
  }, [refreshKey])

  const handleProximidadeChange = useCallback((id, proximo) => {
    setTreinamentosProximos(prev => {
      const jaProximo = prev.has(id)
      if (proximo === jaProximo) return prev
      const next = new Set(prev)
      if (proximo) next.add(id); else next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    fetch('/api/requisicoes/contagem/pendentes', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setReqCount(d.total || 0))
      .catch(() => {})
  }, [reqKey])

  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/atendimentos?redirecionadoPendente=true&agenteId=${user.id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setConversasCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {})
  }, [user?.id, refreshKey, notifKey])

  // Fecha o modal de QR assim que o backend confirma a conexão — sem isso o
  // modal fica preso no spinner, pois o socket não avisa para fechá-lo.
  useEffect(() => { if (connected) setShowQR(false) }, [connected])

  const handleLogout = async () => { await logout(); navigate('/login') }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setEnviandoAvatar(true)
    try { await uploadAvatar(file) }
    catch (err) { alert(err.message) }
    finally { setEnviandoAvatar(false) }
  }

  const navClass = ({ isActive }) =>
    `flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
      isActive
        ? 'text-white bg-[#17171f]'
        : 'text-white/40 hover:text-white/80 hover:bg-[#17171f]'
    }`

  const filtered = nav.filter(n => !n.roles || n.roles.includes(user?.role))

  // max-w-0 (not just opacity) so the label takes no layout space while collapsed —
  // otherwise the hidden text still pushes/centers against the icon and gets clipped.
  const labelClass = 'max-w-0 group-hover:max-w-[10rem] overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR (in-flow: expands on hover and pushes the content over) */}
      <aside className="group w-20 hover:w-56 flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{ background: '#0a0a0f', boxShadow: '6px 0 18px rgba(0,0,0,0.4)' }}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={logoIcon} alt="ileva" className="w-6 h-6 object-contain"/>
          </div>
          <div className={labelClass}>
            <div className="text-sm font-bold text-white">WPP Central</div>
            <div className="text-xs text-white/30">v2.0</div>
          </div>
        </div>

        {/* Status WA */}
        <div className="px-4 py-3">
          <button
            onClick={() => !connected && setShowQR(true)}
            className={`w-full flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-glass-inset ${
              connected
                ? 'text-accent'
                : 'text-red-400 cursor-pointer'
            }`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-accent' : 'bg-red-400 animate-pulse'}`}/>
            <span className={labelClass}>{connected ? 'WhatsApp online' : 'Desconectado — clique'}</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {filtered.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={navClass}>
              <span className="relative flex-shrink-0">
                <FontAwesomeIcon icon={n.icon} className="text-base w-4"/>
                {n.to === '/requisicoes' && reqCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {reqCount > 9 ? '9+' : reqCount}
                  </span>
                )}
                {n.to === '/conversas' && conversasCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {conversasCount > 9 ? '9+' : conversasCount}
                  </span>
                )}
                {n.to === '/treinamentos' && treinamentosProximos.size > 0 && (
                  <span title="Treinamento prestes a começar"
                    className="card-treinamento-proximo absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-red-500"/>
                )}
              </span>
              <span className={labelClass}>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 mb-3">
            <Moldura slug={user?.molduraEquipada} size={32}>
              <label
                title="Alterar foto de perfil"
                className="relative w-8 h-8 rounded-full bg-[#17171f] flex items-center justify-center text-sm font-bold text-white/60 flex-shrink-0 shadow-glass overflow-hidden cursor-pointer group/avatar">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.nome} className="w-full h-full object-cover" />
                  : user?.nome?.charAt(0).toUpperCase()}
                <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${enviandoAvatar ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100'}`}>
                  <FontAwesomeIcon icon={faGear} className={`text-[10px] text-white ${enviandoAvatar ? 'animate-spin' : ''}`} />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={enviandoAvatar} />
              </label>
            </Moldura>
            <div className={`min-w-0 ${labelClass}`}>
              <div className="text-sm font-medium text-white truncate">{user?.nome}</div>
              <div className="text-xs text-white/30 capitalize">{user?.role?.toLowerCase()}</div>
              {user?.tituloEquipado && <TituloBadge slug={user.tituloEquipado} className="mt-1"/>}
            </div>
          </div>
          <button onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className="w-full flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-2 text-xs text-white/30 hover:text-white/80 transition-colors py-1 mb-1">
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="flex-shrink-0"/>
            <span className={labelClass}>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-2 text-xs text-white/30 hover:text-red-400 transition-colors py-1">
            <FontAwesomeIcon icon={faArrowRightFromBracket} className="flex-shrink-0"/>
            <span className={labelClass}>Sair</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet context={{ refreshKey }} />
      </main>

      {/* QR Modal */}
      {showQR && <QRModal qr={qr} onClose={() => setShowQR(false)} />}

      {treinamentosAgendados.map(t => (
        <TreinamentoProximidadeSentinela key={t.id} t={t} onChange={handleProximidadeChange} />
      ))}

      <GamificacaoToastContainer />
      <ToastContainer />
    </div>
  )
}
