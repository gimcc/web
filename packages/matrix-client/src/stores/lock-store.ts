import { create } from 'zustand'

export interface LockState {
  isLocked: boolean
  hasPassword: boolean
  dek: CryptoKey | null

  lock: () => void
  unlock: (dek: CryptoKey) => void
  setHasPassword: (has: boolean) => void
  setDek: (dek: CryptoKey | null) => void
  reset: () => void
}

const initialState = {
  isLocked: false,
  hasPassword: false,
  dek: null as CryptoKey | null,
}

export const useLockStore = create<LockState>(set => ({
  ...initialState,

  lock: () => set({ isLocked: true, dek: null }),

  unlock: (dek: CryptoKey) => set({ isLocked: false, dek }),

  setHasPassword: (has: boolean) => set({ hasPassword: has }),

  setDek: (dek: CryptoKey | null) => set({ dek }),

  reset: () => set(initialState),
}))
