import type { VerificationRequest } from 'matrix-js-sdk/lib/crypto-api'
import { create } from 'zustand'

export interface KeyBackupProgress {
  current: number
  total: number
}

export interface SecretStorageKeyRequest {
  keys: Record<string, unknown>
  resolve: (result: [string, Uint8Array<ArrayBuffer>] | null) => void
}

export interface CryptoState {
  isInitialized: boolean
  crossSigningReady: boolean
  keyBackupEnabled: boolean
  keyBackupProgress: KeyBackupProgress | null
  verificationRequest: VerificationRequest | null
  secretStorageReady: boolean
  secretStorageKeyRequest: SecretStorageKeyRequest | null

  setInitialized: (ready: boolean) => void
  setCrossSigningReady: (ready: boolean) => void
  setKeyBackupEnabled: (enabled: boolean) => void
  setKeyBackupProgress: (progress: KeyBackupProgress | null) => void
  setVerificationRequest: (request: VerificationRequest | null) => void
  setSecretStorageReady: (ready: boolean) => void
  requestSecretStorageKey: (
    keys: Record<string, unknown>,
    resolve: (result: [string, Uint8Array<ArrayBuffer>] | null) => void,
  ) => void
  clearSecretStorageKeyRequest: () => void
  reset: () => void
}

const initialState = {
  isInitialized: false,
  crossSigningReady: false,
  keyBackupEnabled: false,
  keyBackupProgress: null as KeyBackupProgress | null,
  verificationRequest: null as VerificationRequest | null,
  secretStorageReady: false,
  secretStorageKeyRequest: null as SecretStorageKeyRequest | null,
}

export const useCryptoStore = create<CryptoState>(set => ({
  ...initialState,

  setInitialized: ready => set({ isInitialized: ready }),

  setCrossSigningReady: ready => set({ crossSigningReady: ready }),

  setKeyBackupEnabled: enabled => set({ keyBackupEnabled: enabled }),

  setKeyBackupProgress: progress => set({ keyBackupProgress: progress }),

  setVerificationRequest: request => set({ verificationRequest: request }),

  setSecretStorageReady: ready => set({ secretStorageReady: ready }),

  requestSecretStorageKey: (keys, resolve) =>
    set({ secretStorageKeyRequest: { keys, resolve } }),

  clearSecretStorageKeyRequest: () => set({ secretStorageKeyRequest: null }),

  reset: () => set(initialState),
}))
