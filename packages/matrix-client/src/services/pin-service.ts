import type { TimelineMessage } from '../stores/messages-store'
import { EventType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { matrixEventToTimelineMessage } from './message-service'

/**
 * Get pinned event IDs for a room.
 */
export function getPinnedEventIds(roomId: string): string[] {
  const client = getMatrixClient()
  if (!client)
    return []

  const room = client.getRoom(roomId)
  if (!room)
    return []

  const pinEvent = room.currentState.getStateEvents(EventType.RoomPinnedEvents, '')
  if (!pinEvent)
    return []

  const pinned = pinEvent.getContent()?.pinned
  return Array.isArray(pinned) ? pinned : []
}

/**
 * Get pinned messages as TimelineMessage objects.
 */
export function getPinnedMessages(roomId: string): TimelineMessage[] {
  const client = getMatrixClient()
  if (!client)
    return []

  const room = client.getRoom(roomId)
  if (!room)
    return []

  const pinnedIds = getPinnedEventIds(roomId)
  if (pinnedIds.length === 0)
    return []

  const messages: TimelineMessage[] = []
  for (const eventId of pinnedIds) {
    const event = room.findEventById(eventId)
    if (event && event.getType() === 'm.room.message') {
      messages.push(matrixEventToTimelineMessage(event, client))
    }
  }
  return messages
}

/**
 * Pin a message in a room.
 */
export async function pinMessage(roomId: string, eventId: string): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const current = getPinnedEventIds(roomId)
  if (current.includes(eventId))
    return

  await client.sendStateEvent(roomId, EventType.RoomPinnedEvents, {
    pinned: [...current, eventId],
  }, '')
}

/**
 * Unpin a message in a room.
 */
export async function unpinMessage(roomId: string, eventId: string): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const current = getPinnedEventIds(roomId)
  if (!current.includes(eventId))
    return

  await client.sendStateEvent(roomId, EventType.RoomPinnedEvents, {
    pinned: current.filter(id => id !== eventId),
  }, '')
}
