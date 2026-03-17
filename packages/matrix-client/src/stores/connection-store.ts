import { create } from 'zustand'

export type ConnectionStatus
  = | 'disconnected'
    | 'connecting'
    | 'syncing'
    | 'reconnecting'
    | 'error'

export interface ConnectionState {
  status: ConnectionStatus
  error: string | null
  lastSyncTimestamp: number | null
  setStatus: (status: ConnectionStatus, error?: string | null) => void
  setLastSync: (timestamp: number) => void
  reset: () => void
}

const initialState = {
  status: 'disconnected' as ConnectionStatus,
  error: null as string | null,
  lastSyncTimestamp: null as number | null,
}

export const useConnectionStore = create<ConnectionState>(set => ({
  ...initialState,

  setStatus: (status, error = null) => set({ status, error }),

  setLastSync: timestamp => set({ lastSyncTimestamp: timestamp }),

  reset: () => set(initialState),
}))
