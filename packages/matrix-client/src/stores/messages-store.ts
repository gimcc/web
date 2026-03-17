import { create } from 'zustand'

export type MessageStatus = 'sending' | 'sent' | 'failed'

export interface TimelineMessage {
  eventId: string
  roomId: string
  senderId: string
  senderName: string
  type: string
  msgtype: string
  body: string
  formattedBody?: string
  timestamp: number
  status: MessageStatus
  // Media fields
  url?: string
  thumbnailUrl?: string
  info?: {
    w?: number
    h?: number
    size?: number
    mimetype?: string
    thumbnail_url?: string
    thumbnail_info?: {
      w?: number
      h?: number
      size?: number
      mimetype?: string
    }
  }
  filename?: string
}

export interface MessagesState {
  /** roomId -> messages (sorted by timestamp ascending) */
  timelines: Map<string, TimelineMessage[]>
  /** roomId -> true if there are older messages to load */
  hasMore: Map<string, boolean>
  /** roomId -> pagination token */
  paginationTokens: Map<string, string>

  setTimeline: (roomId: string, messages: TimelineMessage[], hasMore: boolean) => void
  appendMessages: (roomId: string, messages: TimelineMessage[]) => void
  prependMessages: (roomId: string, messages: TimelineMessage[], hasMore: boolean, token?: string) => void
  addOptimisticMessage: (message: TimelineMessage) => void
  confirmMessage: (roomId: string, tempEventId: string, confirmedEventId: string, updates?: Partial<TimelineMessage>) => void
  failMessage: (roomId: string, eventId: string) => void
  removeMessage: (roomId: string, eventId: string) => void
  getTimeline: (roomId: string) => TimelineMessage[]
  clearRoom: (roomId: string) => void
  reset: () => void
}

const initialState = {
  timelines: new Map<string, TimelineMessage[]>(),
  hasMore: new Map<string, boolean>(),
  paginationTokens: new Map<string, string>(),
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  ...initialState,

  setTimeline: (roomId, messages, hasMore) => {
    const timelines = new Map(get().timelines)
    const hasMoreMap = new Map(get().hasMore)
    timelines.set(roomId, messages)
    hasMoreMap.set(roomId, hasMore)
    set({ timelines, hasMore: hasMoreMap })
  },

  appendMessages: (roomId, messages) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId) ?? []
    const existingIds = new Set(existing.map(m => m.eventId))
    const newMessages = messages.filter(m => !existingIds.has(m.eventId))
    timelines.set(roomId, [...existing, ...newMessages])
    set({ timelines })
  },

  prependMessages: (roomId, messages, hasMore, token) => {
    const timelines = new Map(get().timelines)
    const hasMoreMap = new Map(get().hasMore)
    const tokenMap = new Map(get().paginationTokens)

    const existing = timelines.get(roomId) ?? []
    const existingIds = new Set(existing.map(m => m.eventId))
    const newMessages = messages.filter(m => !existingIds.has(m.eventId))
    timelines.set(roomId, [...newMessages, ...existing])
    hasMoreMap.set(roomId, hasMore)
    if (token) {
      tokenMap.set(roomId, token)
    }

    set({ timelines, hasMore: hasMoreMap, paginationTokens: tokenMap })
  },

  addOptimisticMessage: (message) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(message.roomId) ?? []
    timelines.set(message.roomId, [...existing, message])
    set({ timelines })
  },

  confirmMessage: (roomId, tempEventId, confirmedEventId, updates) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map(m =>
        m.eventId === tempEventId
          ? { ...m, ...updates, eventId: confirmedEventId, status: 'sent' as const }
          : m,
      ),
    )
    set({ timelines })
  },

  failMessage: (roomId, eventId) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map(m =>
        m.eventId === eventId ? { ...m, status: 'failed' as const } : m,
      ),
    )
    set({ timelines })
  },

  removeMessage: (roomId, eventId) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(roomId, existing.filter(m => m.eventId !== eventId))
    set({ timelines })
  },

  getTimeline: (roomId) => {
    return get().timelines.get(roomId) ?? []
  },

  clearRoom: (roomId) => {
    const timelines = new Map(get().timelines)
    const hasMoreMap = new Map(get().hasMore)
    const tokenMap = new Map(get().paginationTokens)
    timelines.delete(roomId)
    hasMoreMap.delete(roomId)
    tokenMap.delete(roomId)
    set({ timelines, hasMore: hasMoreMap, paginationTokens: tokenMap })
  },

  reset: () => set(initialState),
}))
