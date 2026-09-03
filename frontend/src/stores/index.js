import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),

  login: async (email, senha) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Falha ao entrar, tente novamente')
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user })
    return data.user
  },

  signup: async (nome, email, senha) => {
    const r = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Falha ao cadastrar, tente novamente')
    return data
  },

  logout: async () => {
    const token = get().token
    if (token) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },

  fetchMe: async () => {
    const token = get().token
    if (!token) return
    const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) set({ user: await r.json() })
    else { localStorage.removeItem('token'); set({ token: null, user: null }) }
  },

  authHeaders: () => ({ Authorization: `Bearer ${get().token}`, 'Content-Type': 'application/json' }),

  uploadAvatar: async (file) => {
    const form = new FormData()
    form.append('avatar', file)
    const r = await fetch('/api/usuarios/me/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${get().token}` },
      body: form
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Falha ao enviar imagem')
    set({ user: data })
    return data
  },

  uploadGrupoLogo: async (jid, file) => {
    const form = new FormData()
    form.append('logo', file)
    const r = await fetch(`/api/grupos/${encodeURIComponent(jid)}/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${get().token}` },
      body: form
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Falha ao enviar imagem')
    return data
  },

  uploadAgenteAvatar: async (id, file) => {
    const form = new FormData()
    form.append('avatar', file)
    const r = await fetch(`/api/agentes/${id}/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${get().token}` },
      body: form
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Falha ao enviar imagem')
    return data
  },

  equipar: async (tipo, slug) => {
    const r = await fetch('/api/gamificacao/equipar', {
      method: 'PATCH',
      headers: get().authHeaders(),
      body: JSON.stringify({ tipo, slug })
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Falha ao equipar')
    set({ user: data })
    return data
  },

  abrirBau: async (slug) => {
    const r = await fetch(`/api/gamificacao/bau/${encodeURIComponent(slug)}/abrir`, {
      method: 'POST',
      headers: get().authHeaders(),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || 'Falha ao abrir baú')
    return data
  }
}))

const THEME_KEY = 'theme'

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
}

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark',

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
}))

applyTheme(useThemeStore.getState().theme)

export const useWAStore = create((set) => ({
  connected: false,
  qr: null,
  setConnected: (v) => set({ connected: v, qr: null }),
  setQR: (qr) => set({ qr }),
  setDisconnected: () => set({ connected: false }),
}))

const NOTIF_KEY = 'notificacaoSom'
const notifPersistidas = JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}')

const salvarNotif = (state) => localStorage.setItem(NOTIF_KEY, JSON.stringify(state))

export const useNotificacaoStore = create((set, get) => ({
  ativo: notifPersistidas.ativo ?? true,
  volume: notifPersistidas.volume ?? 0.5,
  som: notifPersistidas.som ?? 'padrao',

  setAtivo: (ativo) => { salvarNotif({ ...get(), ativo }); set({ ativo }) },
  setVolume: (volume) => { salvarNotif({ ...get(), volume }); set({ volume }) },
  setSom: (som) => { salvarNotif({ ...get(), som }); set({ som }) },
}))

export const useGamificacaoStore = create((set, get) => ({
  toasts: [],
  pushToast: (payload) => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, ...payload }] })
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}))

const TOAST_DURACAO_MS = 4000

export const useToastStore = create((set, get) => ({
  toasts: [],
  show: (mensagem, tipo = 'info') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, mensagem, tipo }] })
    setTimeout(() => get().dismiss(id), TOAST_DURACAO_MS)
    return id
  },
  sucesso: (mensagem) => get().show(mensagem, 'sucesso'),
  erro: (mensagem) => get().show(mensagem, 'erro'),
  dismiss: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}))
