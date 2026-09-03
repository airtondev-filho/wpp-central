import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/index.js'
import Layout from './components/layout/Layout.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RaioX from './pages/RaioX.jsx'
import Central from './pages/Central.jsx'
import Conversas from './pages/Conversas.jsx'
import Conversar from './pages/Conversar.jsx'
import Tarefas from './pages/Tarefas.jsx'
import QuadroDetalhe from './pages/QuadroDetalhe.jsx'
import Treinamentos from './pages/Treinamentos.jsx'
import Agenda from './pages/Agenda.jsx'
import Grupos from './pages/Grupos.jsx'
import Requisicoes from './pages/Requisicoes.jsx'
import Agentes from './pages/Agentes.jsx'
import Ranking from './pages/Ranking.jsx'
import Conquistas from './pages/Conquistas.jsx'
import Automacao from './pages/Automacao.jsx'
import Configuracoes from './pages/Configuracoes.jsx'

function Guard({ children, roles }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!user)  return <div className="flex h-screen items-center justify-center text-ink/40">Carregando…</div>
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { fetchMe, token } = useAuthStore()

  useEffect(() => { if (token) fetchMe() }, [token])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/cadastro" element={<Signup />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="raio-x" element={<RaioX />} />
        <Route path="central" element={<Central />} />
        <Route path="conversas" element={<Conversas />} />
        <Route path="conversar/:id" element={<Conversar />} />
        <Route path="tarefas" element={<Tarefas />} />
        <Route path="tarefas/:id" element={<QuadroDetalhe />} />
        <Route path="treinamentos" element={<Treinamentos />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="grupos" element={<Grupos />} />
        <Route path="requisicoes" element={<Requisicoes />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="conquistas" element={<Conquistas />} />
        <Route path="agentes" element={<Guard roles={['ADMIN','SUPERVISOR','AGENTE']}><Agentes /></Guard>} />
        <Route path="automacao" element={<Guard roles={['ADMIN']}><Automacao /></Guard>} />
        <Route path="configuracoes" element={<Guard roles={['ADMIN','SUPERVISOR']}><Configuracoes /></Guard>} />
      </Route>
    </Routes>
  )
}
