import { create } from 'zustand'

export type PresenceStatus = 'online' | 'offline' | 'unavailable'

export interface PresenceInfo {
  status: PresenceStatus
  lastActiveAgo?: number
  statusMessage?: string
}

export interface PresenceState {
  presenceByUser: Map<string, PresenceInfo>
  setPresence: (userId: string, info: PresenceInfo) => void
  removePresence: (userId: string) => void
  reset: () => void
}

const initialState = {
  presenceByUser: new Map<string, PresenceInfo>(),
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  ...initialState,

  setPresence: (userId, info) => {
    const presenceByUser = new Map(get().presenceByUser)
    presenceByUser.set(userId, info)
    set({ presenceByUser })
  },

  removePresence: (userId) => {
    const presenceByUser = new Map(get().presenceByUser)
    presenceByUser.delete(userId)
    set({ presenceByUser })
  },

  reset: () => set({ presenceByUser: new Map() }),
}))
