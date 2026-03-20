import type { AuthCredentials, AuthSession } from './auth-service'
import { create } from 'zustand'
import { useLockStore } from '../stores/lock-store'
import { clearCryptoStore } from '../utils/clear-crypto-store'
import {
  clearPersistedSession,
  loadPersistedSession,
  loginWithToken as realLoginWithToken,
  persistSession,
  login as realLogin,
  register as realRegister,
} from './auth-service'
import { mockLogin, mockRegister } from './mock-auth-service'

export interface AuthState {
  isAuthenticated: boolean
  isRestoring: boolean
  session: AuthSession | null
  isLoading: boolean
  error: string | null
  mockMode: boolean
  setMockMode: (mock: boolean) => void
  login: (credentials: AuthCredentials) => Promise<void>
  loginWithToken: (homeserverUrl: string, token: string) => Promise<void>
  register: (credentials: AuthCredentials) => Promise<void>
  logout: () => void
  restoreSession: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isRestoring: true,
  session: null,
  isLoading: false,
  error: null,
  mockMode: false,

  setMockMode: (mock: boolean) => set({ mockMode: mock }),

  login: async (credentials: AuthCredentials) => {
    set({ isLoading: true, error: null })
    try {
      const loginFn = get().mockMode ? mockLogin : realLogin
      const session = await loginFn(credentials)
      if (!get().mockMode) {
        persistSession(session)
      }
      set({ isAuthenticated: true, session, isLoading: false })
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      set({ error: message, isLoading: false })
    }
  },

  loginWithToken: async (homeserverUrl: string, token: string) => {
    set({ isLoading: true, error: null })
    try {
      const session = await realLoginWithToken(homeserverUrl, token)
      persistSession(session)
      set({ isAuthenticated: true, session, isLoading: false })
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Token login failed'
      set({ error: message, isLoading: false })
    }
  },

  register: async (credentials: AuthCredentials) => {
    set({ isLoading: true, error: null })
    try {
      const registerFn = get().mockMode ? mockRegister : realRegister
      const session = await registerFn(credentials)
      if (!get().mockMode) {
        persistSession(session)
      }
      set({ isAuthenticated: true, session, isLoading: false })
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      set({ error: message, isLoading: false })
    }
  },

  logout: () => {
    clearPersistedSession()
    clearCryptoStore()
    useLockStore.getState().reset()
    set({ isAuthenticated: false, session: null, error: null })
  },

  restoreSession: () => {
    const session = loadPersistedSession()
    if (session) {
      set({ isAuthenticated: true, session, isRestoring: false })
    }
    else {
      set({ isRestoring: false })
    }
  },
}))
