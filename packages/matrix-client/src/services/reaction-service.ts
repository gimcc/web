import { getMatrixClient } from '../client/client-manager'
import { useMessagesStore } from '../stores/messages-store'

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
  useMessagesStore.getState().addReaction(roomId, targetEventId, emoji, userId)

  try {
    const response = await client.sendEvent(roomId, 'm.reaction' as any, {
      'm.relates_to': {
        rel_type: 'm.annotation',
        event_id: targetEventId,
        key: emoji,
      },
    })

    // Store the reaction event ID for future redaction
    useMessagesStore.getState().addReaction(
      roomId,
      targetEventId,
      emoji,
      userId,
      response.event_id,
    )
  }
  catch {
    // Rollback on failure
    useMessagesStore.getState().removeReaction(roomId, targetEventId, emoji, userId)
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
  const store = useMessagesStore.getState()
  const timeline = store.getTimeline(roomId)
  const message = timeline.find(m => m.eventId === targetEventId)
  const reaction = message?.reactions?.find(r => r.emoji === emoji)
  const reactionEventId = reaction?.eventIds?.[userId]

  if (!reactionEventId)
    return

  // Optimistically remove
  store.removeReaction(roomId, targetEventId, emoji, userId)

  try {
    await client.redactEvent(roomId, reactionEventId)
  }
  catch {
    // Rollback on failure
    store.addReaction(roomId, targetEventId, emoji, userId, reactionEventId)
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

  const userId = client.getUserId() ?? ''
  const timeline = useMessagesStore.getState().getTimeline(roomId)
  const message = timeline.find(m => m.eventId === targetEventId)
  const reaction = message?.reactions?.find(r => r.emoji === emoji)
  const hasReacted = reaction?.senderIds.includes(userId) ?? false

  if (hasReacted) {
    await redactReaction(roomId, targetEventId, emoji)
  }
  else {
    await sendReaction(roomId, targetEventId, emoji)
  }
}
