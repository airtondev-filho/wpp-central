import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/index.js'
import AuthLayout from '../components/auth/AuthLayout.jsx'

export default function Login() {
  const { login } = useAuthStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro,  setErro]  = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErro(''); setLoading(true)
    try { await login(email, senha); nav('/') }
    catch(err) { setErro(err.message) }
    finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Faça seu Login" subtitle="Entre com sua conta para continuar">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {erro}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40 font-medium">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="seu@email.com"
            className="input-glass px-4 py-3 text-sm w-full rounded-xl"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/40 font-medium">Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required
            placeholder="••••••••"
            className="input-glass px-4 py-3 text-sm w-full rounded-xl"/>
        </div>

        <Link to="/esqueci-senha" className="text-xs text-white/40 hover:text-violet-400 transition-colors self-end -mt-1">
          Esqueci minha senha
        </Link>

        <button type="submit" disabled={loading}
          className="mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <Link to="/cadastro" className="text-center text-xs text-white/40 hover:text-violet-400 transition-colors mt-1">
          Ainda não tenho uma conta
        </Link>
      </form>
    </AuthLayout>
  )
}
