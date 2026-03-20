import { getMatrixClient } from '../client/client-manager'
import { useTimelineStore } from '../stores/timeline-store'

/** Track in-flight toggles to prevent double-tap races */
const inflight = new Set<string>()

function inflightKey(roomId: string, eventId: string, emoji: string): string {
  return `${roomId}:${eventId}:${emoji}`
}

export async function sendReaction(
  roomId: string,
  targetEventId: string,
  emoji: string,
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const userId = client.getUserId() ?? ''

  // Optimistically add the reaction
  useTimelineStore.getState().addOptimisticReaction(roomId, {
    targetEventId,
    emoji,
    senderId: userId,
  })

  try {
    await client.sendEvent(roomId, 'm.reaction' as any, {
      'm.relates_to': {
        rel_type: 'm.annotation',
        event_id: targetEventId,
        key: emoji,
      },
    })

    // Remove optimistic — SDK will have the confirmed reaction on next version bump
    useTimelineStore.getState().removeOptimisticReaction(roomId, targetEventId, emoji, userId)
    // Bump version so the SDK reaction is read
    useTimelineStore.getState().bumpVersion(roomId)
  }
  catch {
    // Rollback
    useTimelineStore.getState().removeOptimisticReaction(roomId, targetEventId, emoji, userId)
  }
}

export async function redactReaction(
  roomId: string,
  targetEventId: string,
  emoji: string,
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const userId = client.getUserId() ?? ''

  // Find the reaction event ID from SDK Relations
  const room = client.getRoom(roomId)
  if (!room)
    return

  let reactionEventId: string | undefined
  try {
    const relations = room.relations.getChildEventsForEvent(targetEventId, 'm.annotation', 'm.reaction')
    if (relations) {
      const sorted: Array<[string, Set<any>]> = relations.getSortedAnnotationsByKey() ?? []
      for (const [key, events] of sorted) {
        if (key === emoji) {
          for (const e of events) {
            if (e.getSender() === userId) {
              reactionEventId = e.getId()
              break
            }
          }
        }
      }
    }
  }
  catch { /* ignore */ }

  if (!reactionEventId)
    return

  try {
    await client.redactEvent(roomId, reactionEventId)
    // Bump version so the redacted reaction is removed from SDK view
    useTimelineStore.getState().bumpVersion(roomId)
  }
  catch {
    // Re-sync from SDK so the un-redacted reaction reappears
    useTimelineStore.getState().bumpVersion(roomId)
  }
}

export async function toggleReaction(
  roomId: string,
  targetEventId: string,
  emoji: string,
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const key = inflightKey(roomId, targetEventId, emoji)
  if (inflight.has(key))
    return
  inflight.add(key)

  try {
    const userId = client.getUserId() ?? ''
    const room = client.getRoom(roomId)
    if (!room)
      return

    // Check if user has already reacted via SDK Relations
    let hasReacted = false
    try {
      const relations = room.relations.getChildEventsForEvent(targetEventId, 'm.annotation', 'm.reaction')
      if (relations) {
        const sorted: Array<[string, Set<any>]> = relations.getSortedAnnotationsByKey() ?? []
        for (const [key, events] of sorted) {
          if (key === emoji) {
            for (const e of events) {
              if (e.getSender() === userId) {
                hasReacted = true
                break
              }
            }
          }
        }
      }
    }
    catch { /* ignore */ }

    if (hasReacted) {
      await redactReaction(roomId, targetEventId, emoji)
    }
    else {
      await sendReaction(roomId, targetEventId, emoji)
    }
  }
  finally {
    inflight.delete(key)
  }
}
