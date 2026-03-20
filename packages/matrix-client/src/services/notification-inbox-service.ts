import type { MatrixClient } from 'matrix-js-sdk'

export interface NotificationItem {
  eventId: string
  roomId: string
  roomName: string
  senderName: string
  senderId: string
  body: string
  timestamp: number
  read: boolean
}

/**
 * Get aggregated notifications from all rooms (unread highlights and mentions).
 */
export function getNotifications(client: MatrixClient): NotificationItem[] {
  const items: NotificationItem[] = []
  const myUserId = client.getUserId()

  for (const room of client.getRooms()) {
    if (room.getMyMembership() !== 'join')
      continue

    const highlight = room.getUnreadNotificationCount('highlight' as any) ?? 0
    if (highlight === 0)
      continue

    const events = room.getLiveTimeline().getEvents()
    for (let i = events.length - 1; i >= 0 && items.length < 100; i--) {
      const event = events[i]!
      const type = event.getType()
      if (type !== 'm.room.message' && type !== 'm.sticker')
        continue

      const sender = event.getSender()
      if (sender === myUserId)
        continue

      const content = event.getContent()
      const body = content.body ?? ''

      items.push({
        eventId: event.getId()!,
        roomId: room.roomId,
        roomName: room.name ?? room.roomId,
        senderName: room.getMember(sender ?? '')?.name ?? sender ?? '',
        senderId: sender ?? '',
        body,
        timestamp: event.getTs(),
        read: false,
      })
    }
  }

  items.sort((a, b) => b.timestamp - a.timestamp)
  return items
}

/**
 * Mark all notifications in a room as read.
 */
export async function markRoomNotificationsRead(
  client: MatrixClient,
  roomId: string,
): Promise<void> {
  const room = client.getRoom(roomId)
  if (!room)
    return

  const events = room.getLiveTimeline().getEvents()
  const lastEvent = events.at(-1)
  if (lastEvent) {
    await client.sendReadReceipt(lastEvent)
  }
}
