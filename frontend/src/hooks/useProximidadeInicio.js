import { useEffect, useState } from 'react'
import { useNotificacaoStore } from '../stores/index.js'
import { tocarNotificacao } from '../utils/notificationSound.js'

export const PROXIMIDADE_MS = 10 * 60 * 1000 // avisa quando faltam 10min ou menos para o início

// Módulo compartilhado entre todas as telas (Treinamentos, Layout, etc.) — garante
// que o som de proximidade só dispare uma vez por treinamento, mesmo com o hook
// montado em mais de um lugar ao mesmo tempo.
const alertadosProximidade = new Set()

export function useProximidadeInicio(t) {
  const [proximo, setProximo] = useState(false)
  useEffect(() => {
    if (!t?.data || !['AGENDADO', 'PLANEJADO'].includes(t.status)) { setProximo(false); return }
    const verificar = () => {
      const diff = new Date(t.data).getTime() - Date.now()
      const estaProximo = diff > 0 && diff <= PROXIMIDADE_MS
      setProximo(estaProximo)
      if (estaProximo && !alertadosProximidade.has(t.id)) {
        alertadosProximidade.add(t.id)
        const { ativo, volume, som } = useNotificacaoStore.getState()
        if (ativo) tocarNotificacao(som, volume)
      }
    }
    verificar()
    const id = setInterval(verificar, 15000)
    return () => clearInterval(id)
  }, [t?.id, t?.data, t?.status])
  return proximo
}
