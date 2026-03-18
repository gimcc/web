import { create } from 'zustand'

export type MessageStatus = 'sending' | 'sent' | 'failed'

export interface Reaction {
  emoji: string
  senderIds: string[]
  /** Maps senderId -> reaction eventId (needed for redaction) */
  eventIds?: Record<string, string>
}

export interface ReplyTo {
  eventId: string
  senderId: string
  senderName: string
  body: string
}

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
  reactions?: Reaction[]
  // Edit/delete/reply fields
  edited?: boolean
  editedAt?: number
  redacted?: boolean
  replyTo?: ReplyTo
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
  addReaction: (roomId: string, targetEventId: string, emoji: string, senderId: string, reactionEventId?: string) => void
  updateReactionEventId: (roomId: string, targetEventId: string, emoji: string, senderId: string, reactionEventId: string) => void
  removeReaction: (roomId: string, targetEventId: string, emoji: string, senderId: string) => void
  removeReactionByEventId: (roomId: string, reactionEventId: string) => void
  updateMessage: (roomId: string, eventId: string, updates: Partial<TimelineMessage>) => void
  redactMessage: (roomId: string, eventId: string) => void
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

  addReaction: (roomId, targetEventId, emoji, senderId, reactionEventId) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map((m) => {
        if (m.eventId !== targetEventId)
          return m
        const reactions = [...(m.reactions ?? [])]
        const idx = reactions.findIndex(r => r.emoji === emoji)
        if (idx >= 0) {
          const r = reactions[idx]!
          if (r.senderIds.includes(senderId))
            return m
          reactions[idx] = {
            emoji,
            senderIds: [...r.senderIds, senderId],
            eventIds: { ...r.eventIds, ...(reactionEventId ? { [senderId]: reactionEventId } : {}) },
          }
        }
        else {
          reactions.push({
            emoji,
            senderIds: [senderId],
            eventIds: reactionEventId ? { [senderId]: reactionEventId } : {},
          })
        }
        return { ...m, reactions }
      }),
    )
    set({ timelines })
  },

  updateReactionEventId: (roomId, targetEventId, emoji, senderId, reactionEventId) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map((m) => {
        if (m.eventId !== targetEventId)
          return m
        const reactions = (m.reactions ?? []).map((r) => {
          if (r.emoji !== emoji)
            return r
          if (!r.senderIds.includes(senderId))
            return r
          return { ...r, eventIds: { ...r.eventIds, [senderId]: reactionEventId } }
        })
        return { ...m, reactions }
      }),
    )
    set({ timelines })
  },

  removeReaction: (roomId, targetEventId, emoji, senderId) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map((m) => {
        if (m.eventId !== targetEventId)
          return m
        const reactions = (m.reactions ?? [])
          .map((r) => {
            if (r.emoji !== emoji)
              return r
            const senderIds = r.senderIds.filter(id => id !== senderId)
            const eventIds = { ...r.eventIds }
            delete eventIds[senderId]
            return senderIds.length > 0 ? { emoji, senderIds, eventIds } : null
          })
          .filter((r): r is Reaction => r !== null)
        return { ...m, reactions: reactions.length > 0 ? reactions : undefined }
      }),
    )
    set({ timelines })
  },

  updateMessage: (roomId, eventId, updates) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map(m =>
        m.eventId === eventId ? { ...m, ...updates } : m,
      ),
    )
    set({ timelines })
  },

  redactMessage: (roomId, eventId) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map(m =>
        m.eventId === eventId
          ? { ...m, redacted: true, body: '', formattedBody: undefined, url: undefined, filename: undefined }
          : m,
      ),
    )
    set({ timelines })
  },

  removeReactionByEventId: (roomId, reactionEventId) => {
    const timelines = new Map(get().timelines)
    const existing = timelines.get(roomId)
    if (!existing)
      return

    timelines.set(
      roomId,
      existing.map((m) => {
        if (!m.reactions)
          return m
        const reactions = m.reactions
          .map((r) => {
            // Find sender whose reaction eventId matches
            const senderEntry = Object.entries(r.eventIds ?? {}).find(([, eid]) => eid === reactionEventId)
            if (!senderEntry)
              return r
            const senderIds = r.senderIds.filter(id => id !== senderEntry[0])
            const eventIds = { ...r.eventIds }
            delete eventIds[senderEntry[0]]
            return senderIds.length > 0 ? { ...r, senderIds, eventIds } : null
          })
          .filter((r): r is Reaction => r !== null)
        return { ...m, reactions: reactions.length > 0 ? reactions : undefined }
      }),
    )
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
