import { create } from 'zustand'

const STORAGE_KEY = 'matrix-web-drafts'

export interface DraftsState {
  drafts: Map<string, string>
  setDraft: (roomId: string, text: string) => void
  getDraft: (roomId: string) => string
  clearDraft: (roomId: string) => void
  reset: () => void
}

function loadDrafts(): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const entries = JSON.parse(raw) as [string, string][]
      return new Map(entries)
    }
  }
  catch { /* ignore */ }
  return new Map()
}

function persistDrafts(drafts: Map<string, string>): void {
  try {
    const entries = [...drafts.entries()].filter(([, v]) => v.trim().length > 0)
    if (entries.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    }
    else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  catch { /* ignore */ }
}

export const useDraftsStore = create<DraftsState>((set, get) => ({
  drafts: loadDrafts(),

  setDraft: (roomId, text) => {
    const drafts = new Map(get().drafts)
    if (text.trim()) {
      drafts.set(roomId, text)
    }
    else {
      drafts.delete(roomId)
    }
    persistDrafts(drafts)
    set({ drafts })
  },

  getDraft: (roomId) => {
    return get().drafts.get(roomId) ?? ''
  },

  clearDraft: (roomId) => {
    const drafts = new Map(get().drafts)
    drafts.delete(roomId)
    persistDrafts(drafts)
    set({ drafts })
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ drafts: new Map() })
  },
}))
