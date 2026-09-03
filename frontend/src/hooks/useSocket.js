import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useWAStore } from '../stores/index.js'
import { useAuthStore } from '../stores/index.js'
import { useGamificacaoStore } from '../stores/index.js'
import { useNotificacaoStore } from '../stores/index.js'
import { tocarNotificacao } from '../utils/notificationSound.js'

let socket = null

export function getSocket() { return socket }

export function useSocket(onRefresh, onNotificacao, onRequisicao) {
  const { user } = useAuthStore()
  const { setConnected, setQR, setDisconnected } = useWAStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (!user || initialized.current) return
    initialized.current = true

    socket = io({ path: '/socket.io', query: { userId: user.id } })

    socket.on('qr',              ({ qr }) => setQR(qr))
    socket.on('wa_connected',    ()       => setConnected(true))
    socket.on('wa_disconnected', ()       => setDisconnected())
    socket.on('atendimento_updated', (payload) => {
      // ehAgente === false → mensagem recebida do grupo/cliente, não resposta do próprio agente
      if (payload?.ehAgente === false) {
        const { ativo, volume, som } = useNotificacaoStore.getState()
        if (ativo) tocarNotificacao(som, volume)
      }
      onRefresh?.()
    })
    socket.on('prioridade_changed',  ()   => onRefresh?.())
    socket.on('quadro_updated',      ()   => onRefresh?.())
    socket.on('treinamento_updated', ()   => onRefresh?.())
    socket.on('gamificacao_conquista', (payload) => useGamificacaoStore.getState().pushToast(payload))
    socket.on('notificacao',         ()   => onNotificacao?.())
    socket.on('requisicao_updated',  ()   => onRequisicao?.())

    return () => {
      socket?.disconnect()
      initialized.current = false
    }
  }, [user])

  return socket
}
