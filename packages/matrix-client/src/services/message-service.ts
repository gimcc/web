import type { MatrixClient, MatrixEvent } from 'matrix-js-sdk'
import type { TimelineMessage } from '../stores/messages-store'
import { Direction, EventType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useMessagesStore } from '../stores/messages-store'

let tempIdCounter = 0

function generateTempEventId(): string {
  return `~local-${Date.now()}-${++tempIdCounter}`
}

export function matrixEventToTimelineMessage(event: MatrixEvent, client: MatrixClient): TimelineMessage {
  const content = event.getContent()
  const sender = event.getSender() ?? ''
  const room = client.getRoom(event.getRoomId() ?? '')
  const member = room?.getMember(sender)

  return {
    eventId: event.getId() ?? '',
    roomId: event.getRoomId() ?? '',
    senderId: sender,
    senderName: member?.name ?? sender,
    type: event.getType(),
    msgtype: content.msgtype ?? '',
    body: content.body ?? '',
    formattedBody: content.formatted_body,
    timestamp: event.getTs(),
    status: 'sent',
    url: content.url,
    thumbnailUrl: content.info?.thumbnail_url,
    info: content.info,
    filename: content.filename ?? content.body,
  }
}

export async function sendTextMessage(
  roomId: string,
  body: string,
  options?: { formattedBody?: string, msgtype?: string },
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const msgtype = options?.msgtype ?? 'm.text'
  const tempEventId = generateTempEventId()
  const userId = client.getUserId() ?? ''
  const room = client.getRoom(roomId)
  const member = room?.getMember(userId)

  const optimistic: TimelineMessage = {
    eventId: tempEventId,
    roomId,
    senderId: userId,
    senderName: member?.name ?? userId,
    type: 'm.room.message',
    msgtype,
    body,
    formattedBody: options?.formattedBody,
    timestamp: Date.now(),
    status: 'sending',
  }

  useMessagesStore.getState().addOptimisticMessage(optimistic)

  try {
    const content = {
      msgtype,
      body,
      ...(options?.formattedBody
        ? { format: 'org.matrix.custom.html', formatted_body: options.formattedBody }
        : {}),
    }

    const response = await client.sendEvent(roomId, EventType.RoomMessage, content as any)
    useMessagesStore.getState().confirmMessage(roomId, tempEventId, response.event_id)
  }
  catch {
    useMessagesStore.getState().failMessage(roomId, tempEventId)
  }
}

export async function resendMessage(roomId: string, eventId: string): Promise<void> {
  const store = useMessagesStore.getState()
  const timeline = store.getTimeline(roomId)
  const message = timeline.find(m => m.eventId === eventId)

  if (!message || message.status !== 'failed')
    return

  // Remove failed message
  store.removeMessage(roomId, eventId)

  // Resend
  await sendTextMessage(roomId, message.body, {
    formattedBody: message.formattedBody,
    msgtype: message.msgtype,
  })
}

export async function loadRoomHistory(roomId: string): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    return

  const room = client.getRoom(roomId)
  if (!room)
    return

  try {
    const result = await client.scrollback(room, 30)
    if (!result)
      return

    const timeline = room.getLiveTimeline()
    const events = timeline.getEvents()
    const messages = events
      .filter(e => e.getType() === 'm.room.message')
      .map(e => matrixEventToTimelineMessage(e, client))

    const hasMore = timeline.getPaginationToken(Direction.Backward) !== null
    useMessagesStore.getState().setTimeline(roomId, messages, hasMore)
  }
  catch {
    // On failure, mark hasMore as false to prevent infinite retry
    useMessagesStore.getState().setTimeline(
      roomId,
      useMessagesStore.getState().timelines.get(roomId) ?? [],
      false,
    )
  }
}

export function loadInitialTimeline(roomId: string): void {
  const client = getMatrixClient()
  if (!client)
    return

  const room = client.getRoom(roomId)
  if (!room)
    return

  const timeline = room.getLiveTimeline()
  const events = timeline.getEvents()
  const messages = events
    .filter(e => e.getType() === 'm.room.message')
    .map(e => matrixEventToTimelineMessage(e, client))

  const hasMore = timeline.getPaginationToken(Direction.Backward) !== null
  useMessagesStore.getState().setTimeline(roomId, messages, hasMore)
}
