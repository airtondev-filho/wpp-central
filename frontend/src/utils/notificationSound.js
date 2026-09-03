// Sons de notificação sintetizados via Web Audio API — sem depender de arquivos de áudio externos.
let ctx = null
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

const tocarTom = (audioCtx, destino, { freq, inicioEm, duracao, tipo = 'sine', pico = 1 }) => {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = tipo
  osc.frequency.value = freq
  const t0 = audioCtx.currentTime + inicioEm
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(pico, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duracao)
  osc.connect(gain)
  gain.connect(destino)
  osc.start(t0)
  osc.stop(t0 + duracao + 0.02)
}

export const SONS = {
  padrao: { label: 'Padrão', tons: [{ freq: 740, inicioEm: 0, duracao: 0.14 }, { freq: 988, inicioEm: 0.1, duracao: 0.22 }] },
  suave:  { label: 'Suave',  tons: [{ freq: 523, inicioEm: 0, duracao: 0.3, tipo: 'sine' }] },
  alerta: { label: 'Alerta', tons: [{ freq: 880, inicioEm: 0, duracao: 0.1 }, { freq: 880, inicioEm: 0.14, duracao: 0.1 }, { freq: 880, inicioEm: 0.28, duracao: 0.16 }] },
  campainha: { label: 'Campainha', tons: [{ freq: 659, inicioEm: 0, duracao: 0.18 }, { freq: 523, inicioEm: 0.16, duracao: 0.28 }] },
}

export function tocarNotificacao(somId, volume = 0.5) {
  const som = SONS[somId] || SONS.padrao
  if (volume <= 0) return
  try {
    const audioCtx = getCtx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const master = audioCtx.createGain()
    master.gain.value = Math.max(0, Math.min(1, volume))
    master.connect(audioCtx.destination)
    som.tons.forEach(tom => tocarTom(audioCtx, master, tom))
  } catch (err) {
    console.warn('Não foi possível tocar o som de notificação', err)
  }
}
