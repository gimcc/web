import { create } from 'zustand'
import type { TimelineMessage } from './messages-store'

export interface ThreadsState {
  /** threadRootId -> thread messages (sorted by timestamp ascending) */
  threads: Map<string, TimelineMessage[]>
  /** Currently open thread root event ID */
  activeThreadId: string | null

  setActiveThread: (threadRootId: string | null) => void
  setThreadMessages: (threadRootId: string, messages: TimelineMessage[]) => void
  appendThreadMessage: (threadRootId: string, message: TimelineMessage) => void
  incrementThreadReplyCount: (roomId: string, threadRootId: string) => void
  reset: () => void
}

const initialState = {
  threads: new Map<string, TimelineMessage[]>(),
  activeThreadId: null as string | null,
}

export const useThreadsStore = create<ThreadsState>((set, get) => ({
  ...initialState,

  setActiveThread: (threadRootId) => set({ activeThreadId: threadRootId }),

  setThreadMessages: (threadRootId, messages) => {
    const threads = new Map(get().threads)
    threads.set(threadRootId, messages)
    set({ threads })
  },

  appendThreadMessage: (threadRootId, message) => {
    const threads = new Map(get().threads)
    const existing = threads.get(threadRootId) ?? []
    const existingIds = new Set(existing.map(m => m.eventId))
    if (!existingIds.has(message.eventId)) {
      threads.set(threadRootId, [...existing, message])
      set({ threads })
    }
  },

  incrementThreadReplyCount: (_roomId, _threadRootId) => {
    // This is handled by the messages store updating threadReplyCount on the root message
  },

  reset: () => set(initialState),
}))
