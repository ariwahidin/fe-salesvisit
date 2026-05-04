import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  init: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, token: null, isAuthenticated: false,
  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },
  init: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    const us = localStorage.getItem('user')
    if (token && us) {
      try { set({ user: JSON.parse(us), token, isAuthenticated: true }) }
      catch { localStorage.clear() }
    }
  },
}))
