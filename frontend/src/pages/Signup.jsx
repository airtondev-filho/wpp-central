import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import AuthLayout from '../components/auth/AuthLayout.jsx'

export default function Signup() {
  const { signup } = useAuthStore()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErro('')
    if (senha !== confirmar) return setErro('As senhas não coincidem')
    setLoading(true)
    try { await signup(nome, email, senha); setEnviado(true) }
    catch (err) { setErro(err.message) }
    finally { setLoading(false) }
  }

  if (enviado) {
    return (
      <AuthLayout title="Cadastro enviado" subtitle="Falta pouco para você começar">
        <div className="glass rounded-xl px-4 py-5 flex flex-col items-center text-center gap-3">
          <FontAwesomeIcon icon={faCircleCheck} className="text-violet-400 text-3xl"/>
          <p className="text-sm text-white/60">
            Sua conta foi criada e está aguardando aprovação de um administrador.
            Você poderá entrar assim que ela for ativada.
          </p>
        </div>
        <Link to="/login"
          className="mt-4 block text-center bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity">
          Voltar para o login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Crie sua conta" subtitle="Cadastre-se para solicitar acesso">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {erro}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40 font-medium">Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} required
            placeholder="Seu nome"
            className="input-glass px-4 py-3 text-sm w-full rounded-xl"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40 font-medium">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="seu@email.com"
            className="input-glass px-4 py-3 text-sm w-full rounded-xl"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40 font-medium">Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6}
            placeholder="mínimo 6 caracteres"
            className="input-glass px-4 py-3 text-sm w-full rounded-xl"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40 font-medium">Confirmar senha</label>
          <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required minLength={6}
            placeholder="••••••••"
            className="input-glass px-4 py-3 text-sm w-full rounded-xl"/>
        </div>

        <button type="submit" disabled={loading}
          className="mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? 'Enviando…' : 'Cadastrar'}
        </button>

        <Link to="/login" className="text-center text-xs text-white/40 hover:text-violet-400 transition-colors mt-1">
          Já tenho uma conta
        </Link>
      </form>
    </AuthLayout>
  )
}
