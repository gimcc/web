import type { AuthCredentials, AuthSession, RegistrationNeedsAuth } from './auth-service'
import type { UiaAuth } from './uia-service'
import { create } from 'zustand'
import { useLockStore } from '../stores/lock-store'
import { clearCryptoStore } from '../utils/clear-crypto-store'
import {
  clearPersistedSession,
  loadPersistedSession,
  persistSession,
  login as realLogin,
  loginWithToken as realLoginWithToken,
  register as realRegister,
  registerContinue as realRegisterContinue,
} from './auth-service'
import { mockLogin, mockRegister } from './mock-auth-service'

export interface AuthState {
  isAuthenticated: boolean
  isRestoring: boolean
  session: AuthSession | null
  isLoading: boolean
  error: string | null
  mockMode: boolean
  /** Pending UIA challenge during registration */
  registrationChallenge: RegistrationNeedsAuth | null
  /** Credentials stored while registration UIA flow is in progress */
  pendingRegistrationCredentials: AuthCredentials | null
  setMockMode: (mock: boolean) => void
  login: (credentials: AuthCredentials) => Promise<void>
  loginWithToken: (homeserverUrl: string, token: string) => Promise<void>
  register: (credentials: AuthCredentials) => Promise<void>
  /** Submit a UIA stage to continue registration */
  registerContinue: (auth: UiaAuth) => Promise<void>
  /** Clear pending registration state */
  clearRegistration: () => void
  logout: () => void
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isRestoring: true,
  session: null,
  isLoading: false,
  error: null,
  mockMode: false,
  registrationChallenge: null,
  pendingRegistrationCredentials: null,

  setMockMode: (mock: boolean) => set({ mockMode: mock }),

  login: async (credentials: AuthCredentials) => {
    set({ isLoading: true, error: null })
    try {
      const loginFn = get().mockMode ? mockLogin : realLogin
      const session = await loginFn(credentials)
      if (!get().mockMode) {
        await persistSession(session, useLockStore.getState().dek)
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
      await persistSession(session, useLockStore.getState().dek)
      set({ isAuthenticated: true, session, isLoading: false })
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Token login failed'
      set({ error: message, isLoading: false })
    }
  },

  register: async (credentials: AuthCredentials) => {
    set({ isLoading: true, error: null, registrationChallenge: null, pendingRegistrationCredentials: null })
    try {
      if (get().mockMode) {
        const session = await mockRegister(credentials)
        set({ isAuthenticated: true, session, isLoading: false })
        return
      }

      const result = await realRegister(credentials)

      if (result.status === 'completed') {
        await persistSession(result.session, useLockStore.getState().dek)
        set({ isAuthenticated: true, session: result.session, isLoading: false })
      }
      else {
        set({
          isLoading: false,
          registrationChallenge: result,
          pendingRegistrationCredentials: credentials,
        })
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      set({ error: message, isLoading: false })
    }
  },

  registerContinue: async (auth: UiaAuth) => {
    const credentials = get().pendingRegistrationCredentials
    if (!credentials) {
      set({ error: 'No pending registration to continue' })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const result = await realRegisterContinue(credentials, auth)

      if (result.status === 'completed') {
        await persistSession(result.session, useLockStore.getState().dek)
        set({
          isAuthenticated: true,
          session: result.session,
          isLoading: false,
          registrationChallenge: null,
          pendingRegistrationCredentials: null,
        })
      }
      else {
        set({
          isLoading: false,
          registrationChallenge: result,
        })
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Registration stage failed'
      set({ error: message, isLoading: false })
    }
  },

  clearRegistration: () => {
    set({ registrationChallenge: null, pendingRegistrationCredentials: null, error: null })
  },

  logout: () => {
    clearPersistedSession()
    clearCryptoStore()
    useLockStore.getState().reset()
    set({ isAuthenticated: false, session: null, error: null })
  },

  restoreSession: async () => {
    const dek = useLockStore.getState().dek
    const session = await loadPersistedSession(dek)
    if (session) {
      set({ isAuthenticated: true, session, isRestoring: false })
    }
    else {
      set({ isRestoring: false })
    }
  },
}))
