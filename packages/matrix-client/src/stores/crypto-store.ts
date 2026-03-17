import { create } from 'zustand'

export interface KeyBackupProgress {
  current: number
  total: number
}

export interface CryptoState {
  isInitialized: boolean
  crossSigningReady: boolean
  keyBackupEnabled: boolean
  keyBackupProgress: KeyBackupProgress | null
  verificationRequest: unknown | null

  setInitialized: (ready: boolean) => void
  setCrossSigningReady: (ready: boolean) => void
  setKeyBackupEnabled: (enabled: boolean) => void
  setKeyBackupProgress: (progress: KeyBackupProgress | null) => void
  setVerificationRequest: (request: unknown | null) => void
  reset: () => void
}

const initialState = {
  isInitialized: false,
  crossSigningReady: false,
  keyBackupEnabled: false,
  keyBackupProgress: null as KeyBackupProgress | null,
  verificationRequest: null as unknown | null,
}

export const useCryptoStore = create<CryptoState>(set => ({
  ...initialState,

  setInitialized: ready => set({ isInitialized: ready }),

  setCrossSigningReady: ready => set({ crossSigningReady: ready }),

  setKeyBackupEnabled: enabled => set({ keyBackupEnabled: enabled }),

  setKeyBackupProgress: progress => set({ keyBackupProgress: progress }),

  setVerificationRequest: request => set({ verificationRequest: request }),

  reset: () => set(initialState),
}))
