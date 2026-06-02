import { create } from 'zustand'
import api from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('fp_token') || null,
  loading: true,

  setToken: (token) => {
    localStorage.setItem('fp_token', token)
    set({ token })
  },

  setUser: (user) => set({ user }),

  fetchMe: async () => {
    const token = get().token
    if (!token) { set({ loading: false }); return }
    try {
      const { data } = await api.get('/users/me')
      set({ user: data, loading: false })
      connectSocket(data.id)
    } catch {
      get().logout()
    }
  },

  logout: () => {
    localStorage.removeItem('fp_token')
    disconnectSocket()
    set({ user: null, token: null, loading: false })
    window.location.href = '/login'
  },
}))

export default useAuthStore
