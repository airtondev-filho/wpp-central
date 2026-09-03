import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faSackDollar } from '@fortawesome/free-solid-svg-icons'
import { useGamificacaoStore } from '../../stores/index.js'
import { iconeDe } from '../../utils/gamificacaoIcons.js'
import Confetti from './Confetti.jsx'
import EmojiRain from './EmojiRain.jsx'
import mascoteCampeao from '../../assets/mascote-campeao.png'

const DURACAO_MS = 5000
const DURACAO_CAMPEAO_MS = 7000
const DURACAO_CHUVA_IDOSO_MS = 5000

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, DURACAO_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="glass-strong rounded-2xl p-4 w-80 flex flex-col gap-2 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <FontAwesomeIcon icon={faSackDollar} className="text-accent"/>
          {toast.subiuDeNivel ? `Você subiu para o nível ${toast.nivelAtual}!` : 'Parabéns pelo atendimento!'}
        </div>
        <button onClick={onDismiss} className="text-ink/30 hover:text-ink text-xs leading-none flex-shrink-0">
          <FontAwesomeIcon icon={faXmark}/>
        </button>
      </div>
      {toast.pontosGanhos > 0 && (
        <div className="text-xs text-ink/50">+{toast.pontosGanhos} pontos <span className="text-ink/30">· total {toast.pontosTotal}</span></div>
      )}
      {[
        ...(toast.badgesDesbloqueados||[]).map(b => ({ ...b, extra: 'nova moldura desbloqueada' })),
        ...(toast.missoesConcluidas||[]).map(m => ({ ...m, extra: 'baú ganho — abra em Conquistas' })),
      ].map(b => (
        <div key={b.slug} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-ink/5">
          <FontAwesomeIcon icon={iconeDe(b.icone)} className="text-amber-400"/>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-ink truncate">{b.nome}</div>
            <div className="text-[11px] text-ink/40 truncate">{b.descricao} · {b.extra}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CampeaoOverlay({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, DURACAO_CAMPEAO_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="overlay-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', '--overlay-blur': '4px' }}
      onClick={onDismiss}>
      <Confetti />
      <div className="glass-strong rounded-3xl p-8 flex flex-col items-center gap-3 max-w-sm text-center animate-[fadeIn_0.3s_ease-out]"
        onClick={e => e.stopPropagation()}>
        <img src={mascoteCampeao} alt="Campeão do ranking" className="w-40 h-40 object-contain drop-shadow-[0_0_25px_rgba(167,139,250,0.5)]"/>
        <div className="text-lg font-black text-ink">🏆 Você é o nº1 do ranking!</div>
        <div className="text-sm text-ink/60">
          E ainda subiu para o nível <span className="text-amber-400 font-bold">{toast.nivelAtual}</span>!
        </div>
        {[
          ...(toast.badgesDesbloqueados||[]).map(b => ({ ...b, extra: 'nova moldura desbloqueada' })),
          ...(toast.missoesConcluidas||[]).map(m => ({ ...m, extra: 'baú ganho — abra em Conquistas' })),
        ].map(b => (
          <div key={b.slug} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink/5 w-full">
            <FontAwesomeIcon icon={iconeDe(b.icone)} className="text-amber-400"/>
            <div className="min-w-0 text-left">
              <div className="text-xs font-semibold text-ink truncate">{b.nome}</div>
              <div className="text-[11px] text-ink/40 truncate">{b.descricao} · {b.extra}</div>
            </div>
          </div>
        ))}
        <button onClick={onDismiss} className="mt-1 text-xs text-ink/40 hover:text-ink transition-colors">Fechar</button>
      </div>
    </div>
  )
}

export default function GamificacaoToastContainer() {
  const { toasts, dismissToast } = useGamificacaoStore()
  const campeao = toasts.find(t => t.subiuDeNivel && t.primeiroColocado)
  const outros = toasts.filter(t => t !== campeao)

  // Chuva de emoji de idoso por 5s ao desbloquear "IDOSO MASTER MEME"
  const [chuvaIdosoId, setChuvaIdosoId] = useState(null)
  useEffect(() => {
    const idosoToast = toasts.find(t => (t.badgesDesbloqueados || []).some(b => b.slug === 'idoso_master_meme'))
    if (idosoToast && idosoToast.id !== chuvaIdosoId) {
      setChuvaIdosoId(idosoToast.id)
      setTimeout(() => setChuvaIdosoId(id => id === idosoToast.id ? null : id), DURACAO_CHUVA_IDOSO_MS)
    }
  }, [toasts])

  return (
    <>
      {campeao && <CampeaoOverlay toast={campeao} onDismiss={() => dismissToast(campeao.id)} />}
      {chuvaIdosoId && <EmojiRain emoji="👴"/>}
      {outros.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-3">
          {outros.map(t => <Toast key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />)}
        </div>
      )}
    </>
  )
}
