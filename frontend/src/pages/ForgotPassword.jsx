import React from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import AuthLayout from '../components/auth/AuthLayout.jsx'

export default function ForgotPassword() {
  return (
    <AuthLayout title="Recuperar senha" subtitle="Redefinição de senha via administrador">
      <div className="glass rounded-xl px-4 py-4 flex gap-3 text-sm text-white/60">
        <FontAwesomeIcon icon={faCircleInfo} className="text-violet-400 mt-0.5 flex-shrink-0"/>
        <p>
          Este sistema não envia e-mail de recuperação. Para redefinir sua senha,
          peça a um administrador para atualizá-la na tela <strong className="text-white">Agentes</strong>.
        </p>
      </div>

      <Link to="/login"
        className="mt-4 block text-center bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity">
        Voltar para o login
      </Link>
    </AuthLayout>
  )
}
