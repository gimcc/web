import type { TimelineMessage } from './messages-store'
import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Timeline store — lightweight store for optimistic messages + version counter.
// The source of truth for confirmed messages is the SDK's EventTimeline.
// This store only tracks:
//   1. Version counter per room → triggers re-reads from SDK
//   2. Optimistic messages (sending/failed) not yet in SDK
//   3. Optimistic reactions not yet confirmed by server
//   4. Pagination state (hasMore)
// ---------------------------------------------------------------------------

export interface OptimisticReaction {
  targetEventId: string
  emoji: string
  senderId: string
  reactionEventId?: string
}

export interface TimelineStoreState {
  /** Per-room version counter — bumped on any SDK event change */
  versions: Map<string, number>
  /** Per-room optimistic messages (status: sending | failed) */
  optimistic: Map<string, TimelineMessage[]>
  /** Per-room optimistic reactions not yet confirmed */
  optimisticReactions: Map<string, OptimisticReaction[]>
  /** Per-room pagination flag */
  hasMore: Map<string, boolean>

  /** Bump version to trigger re-read from SDK */
  bumpVersion: (roomId: string) => void
  /** Add an optimistic message (sending) */
  addOptimistic: (msg: TimelineMessage) => void
  /** Confirm optimistic → remove from store (SDK now has it) */
  confirmOptimistic: (roomId: string, tempId: string, realId: string, updates?: Partial<TimelineMessage>) => void
  /** Mark optimistic as failed */
  failOptimistic: (roomId: string, tempId: string) => void
  /** Remove an optimistic message entirely */
  removeOptimistic: (roomId: string, tempId: string) => void
  /** Add an optimistic reaction */
  addOptimisticReaction: (roomId: string, reaction: OptimisticReaction) => void
  /** Remove an optimistic reaction (confirmed or rolled back) */
  removeOptimisticReaction: (roomId: string, targetEventId: string, emoji: string, senderId: string) => void
  /** Set hasMore flag */
  setHasMore: (roomId: string, hasMore: boolean) => void
  /** Reset all state */
  reset: () => void
}

const initialState = {
  versions: new Map<string, number>(),
  optimistic: new Map<string, TimelineMessage[]>(),
  optimisticReactions: new Map<string, OptimisticReaction[]>(),
  hasMore: new Map<string, boolean>(),
}

export const useTimelineStore = create<TimelineStoreState>((set, get) => ({
  ...initialState,

  bumpVersion: (roomId) => {
    const versions = new Map(get().versions)
    versions.set(roomId, (versions.get(roomId) ?? 0) + 1)
    set({ versions })
  },

  addOptimistic: (msg) => {
    const optimistic = new Map(get().optimistic)
    const existing = optimistic.get(msg.roomId) ?? []
    optimistic.set(msg.roomId, [...existing, msg])
    set({ optimistic })
  },

  confirmOptimistic: (roomId, tempId, _realId, _updates) => {
    const optimistic = new Map(get().optimistic)
    const existing = optimistic.get(roomId)
    if (!existing)
      return
    optimistic.set(roomId, existing.filter(m => m.eventId !== tempId))
    set({ optimistic })
    // Also bump version so SDK data (which now includes the confirmed message) is re-read
    get().bumpVersion(roomId)
  },

  failOptimistic: (roomId, tempId) => {
    const optimistic = new Map(get().optimistic)
    const existing = optimistic.get(roomId)
    if (!existing)
      return
    optimistic.set(
      roomId,
      existing.map(m => m.eventId === tempId ? { ...m, status: 'failed' as const } : m),
    )
    set({ optimistic })
  },

  removeOptimistic: (roomId, tempId) => {
    const optimistic = new Map(get().optimistic)
    const existing = optimistic.get(roomId)
    if (!existing)
      return
    optimistic.set(roomId, existing.filter(m => m.eventId !== tempId))
    set({ optimistic })
  },

  addOptimisticReaction: (roomId, reaction) => {
    const reactions = new Map(get().optimisticReactions)
    const existing = reactions.get(roomId) ?? []
    reactions.set(roomId, [...existing, reaction])
    set({ optimisticReactions: reactions })
  },

  removeOptimisticReaction: (roomId, targetEventId, emoji, senderId) => {
    const reactions = new Map(get().optimisticReactions)
    const existing = reactions.get(roomId)
    if (!existing)
      return
    reactions.set(roomId, existing.filter(
      r => !(r.targetEventId === targetEventId && r.emoji === emoji && r.senderId === senderId),
    ))
    set({ optimisticReactions: reactions })
  },

  setHasMore: (roomId, hasMore) => {
    const map = new Map(get().hasMore)
    map.set(roomId, hasMore)
    set({ hasMore: map })
  },

  reset: () => set(initialState),
}))
