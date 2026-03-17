import { create } from 'zustand'

const IDLE_TIMEOUT_KEY = 'matrix-web:idle-timeout'
const DEFAULT_IDLE_TIMEOUT = 300 // 5 minutes in seconds

export interface LockState {
  isLocked: boolean
  hasPassword: boolean
  dek: CryptoKey | null
  idleTimeout: number // seconds; 0 = disabled

  lock: () => void
  unlock: (dek: CryptoKey) => void
  setHasPassword: (has: boolean) => void
  setDek: (dek: CryptoKey | null) => void
  setIdleTimeout: (seconds: number) => void
  reset: () => void
}

function loadIdleTimeout(): number {
  if (typeof localStorage === 'undefined')
    return DEFAULT_IDLE_TIMEOUT
  const stored = localStorage.getItem(IDLE_TIMEOUT_KEY)
  if (stored === null)
    return DEFAULT_IDLE_TIMEOUT
  const parsed = Number.parseInt(stored, 10)
  return Number.isNaN(parsed) || parsed < 0 ? DEFAULT_IDLE_TIMEOUT : parsed
}

const initialState = {
  isLocked: false,
  hasPassword: false,
  dek: null as CryptoKey | null,
  idleTimeout: loadIdleTimeout(),
}

export const useLockStore = create<LockState>(set => ({
  ...initialState,

  lock: () => set({ isLocked: true, dek: null }),

  unlock: (dek: CryptoKey) => set({ isLocked: false, dek }),

  setHasPassword: (has: boolean) => set({ hasPassword: has }),

  setDek: (dek: CryptoKey | null) => set({ dek }),

  setIdleTimeout: (seconds: number) => {
    localStorage.setItem(IDLE_TIMEOUT_KEY, String(seconds))
    set({ idleTimeout: seconds })
  },

  reset: () => {
    localStorage.removeItem(IDLE_TIMEOUT_KEY)
    set({ ...initialState, idleTimeout: DEFAULT_IDLE_TIMEOUT })
  },
}))
