import { create } from 'zustand'

export interface TypingState {
  typingByRoom: Map<string, string[]>
  setTyping: (roomId: string, userIds: string[]) => void
  clearRoom: (roomId: string) => void
  reset: () => void
}

const initialState = {
  typingByRoom: new Map<string, string[]>(),
}

export const useTypingStore = create<TypingState>((set, get) => ({
  ...initialState,

  setTyping: (roomId, userIds) => {
    const typingByRoom = new Map(get().typingByRoom)
    if (userIds.length === 0) {
      typingByRoom.delete(roomId)
    }
    else {
      typingByRoom.set(roomId, userIds)
    }
    set({ typingByRoom })
  },

  clearRoom: (roomId) => {
    const typingByRoom = new Map(get().typingByRoom)
    typingByRoom.delete(roomId)
    set({ typingByRoom })
  },

  reset: () => set({ typingByRoom: new Map() }),
}))
