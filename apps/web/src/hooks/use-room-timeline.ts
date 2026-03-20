import type { TimelineItem, TimelineMessageItem } from '@matrix-web/matrix-client'
import {
  getMatrixClient,
  readTimeline,
  useAuthStore,
  useMessagesStore,
  useTimelineStore,
} from '@matrix-web/matrix-client'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

const EMPTY_ITEMS: TimelineItem[] = []

/**
 * Subscribe to the timeline for a room.
 * In real mode: re-reads from SDK whenever the version counter bumps.
 * In mock mode: reads from useMessagesStore and wraps into TimelineItem[].
 * Returns a flat TimelineItem[] with grouping + dividers already applied.
 */
export function useRoomTimeline(roomId: string, readUpToEventId?: string): {
  items: TimelineItem[]
  hasMore: boolean
} {
  const mockMode = useAuthStore(s => s.mockMode)

  // --- Real mode subscriptions ---
  const { version, optimistic, optimisticReactions, hasMore: realHasMore } = useTimelineStore(
    useShallow(s => ({
      version: s.versions.get(roomId) ?? 0,
      optimistic: s.optimistic.get(roomId),
      optimisticReactions: s.optimisticReactions.get(roomId),
      hasMore: s.hasMore.get(roomId) ?? false,
    })),
  )

  // --- Mock mode subscriptions ---
  const mockTimelines = useMessagesStore(s => mockMode ? s.timelines : null)
  const mockHasMoreMap = useMessagesStore(s => mockMode ? s.hasMore : null)

  // Build optimistic reactions map for the reader
  const optimisticReactionsMap = useMemo(() => {
    if (mockMode || !optimisticReactions || optimisticReactions.length === 0)
      return undefined
    const map = new Map<string, Array<{ emoji: string, senderIds: string[], eventIds: Record<string, string> }>>()
    for (const r of optimisticReactions) {
      const existing = map.get(r.targetEventId) ?? []
      let entry = existing.find(e => e.emoji === r.emoji)
      if (!entry) {
        entry = { emoji: r.emoji, senderIds: [], eventIds: {} }
        existing.push(entry)
      }
      if (!entry.senderIds.includes(r.senderId)) {
        entry.senderIds.push(r.senderId)
      }
      if (r.reactionEventId) {
        entry.eventIds[r.senderId] = r.reactionEventId
      }
      map.set(r.targetEventId, existing)
    }
    return map
  }, [mockMode, optimisticReactions])

  const items = useMemo(() => {
    if (mockMode) {
      // Mock mode: convert TimelineMessage[] to TimelineMessageItem[]
      const messages = mockTimelines?.get(roomId)
      if (!messages || messages.length === 0)
        return EMPTY_ITEMS
      return messages.map<TimelineMessageItem>(m => ({
        kind: 'message',
        key: m.eventId,
        eventId: m.eventId,
        roomId: m.roomId,
        senderId: m.senderId,
        senderName: m.senderName,
        type: m.type,
        msgtype: m.msgtype,
        body: m.body,
        formattedBody: m.formattedBody,
        timestamp: m.timestamp,
        status: m.status,
        reactions: m.reactions ?? [],
        edited: m.edited ?? false,
        redacted: m.redacted ?? false,
        replyTo: m.replyTo,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        info: m.info,
        filename: m.filename,
        threadRootId: m.threadRootId,
        threadReplyCount: m.threadReplyCount,
        isThreadRoot: m.isThreadRoot,
        collapsed: false,
      }))
    }

    const client = getMatrixClient()
    return readTimeline(client, roomId, {
      optimistic,
      readUpToEventId,
      optimisticReactions: optimisticReactionsMap,
    })
    // version is included to trigger re-computation when SDK data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, mockMode, mockTimelines, version, optimistic, optimisticReactionsMap, readUpToEventId])

  const hasMore = mockMode ? (mockHasMoreMap?.get(roomId) ?? false) : realHasMore

  return { items, hasMore }
}
