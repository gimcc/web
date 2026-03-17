import type { MatrixClient, MatrixEvent } from 'matrix-js-sdk'
import type { Reaction, TimelineMessage } from '../stores/messages-store'
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

function aggregateReactions(events: MatrixEvent[]): Map<string, Reaction[]> {
  const reactionMap = new Map<string, Map<string, { senderIds: string[], eventIds: Record<string, string> }>>()

  for (const event of events) {
    if (event.getType() !== 'm.reaction' || event.isRedacted())
      continue
    const content = event.getContent()
    const relatesTo = content['m.relates_to']
    if (relatesTo?.rel_type !== 'm.annotation' || !relatesTo.event_id || !relatesTo.key)
      continue

    const targetId = relatesTo.event_id as string
    const emoji = relatesTo.key as string
    const senderId = event.getSender() ?? ''
    const eventId = event.getId() ?? ''

    if (!reactionMap.has(targetId)) {
      reactionMap.set(targetId, new Map())
    }
    const emojiMap = reactionMap.get(targetId)!
    if (!emojiMap.has(emoji)) {
      emojiMap.set(emoji, { senderIds: [], eventIds: {} })
    }
    const entry = emojiMap.get(emoji)!
    if (!entry.senderIds.includes(senderId)) {
      entry.senderIds.push(senderId)
      entry.eventIds[senderId] = eventId
    }
  }

  const result = new Map<string, Reaction[]>()
  for (const [targetId, emojiMap] of reactionMap) {
    const reactions: Reaction[] = []
    for (const [emoji, data] of emojiMap) {
      reactions.push({ emoji, senderIds: data.senderIds, eventIds: data.eventIds })
    }
    result.set(targetId, reactions)
  }
  return result
}

function applyReactionsToMessages(messages: TimelineMessage[], allEvents: MatrixEvent[]): TimelineMessage[] {
  const reactionsByTarget = aggregateReactions(allEvents)
  if (reactionsByTarget.size === 0)
    return messages

  return messages.map((m) => {
    const reactions = reactionsByTarget.get(m.eventId)
    return reactions ? { ...m, reactions } : m
  })
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

/** Merge live-sync reactions from current store into freshly loaded messages */
function mergeStoreReactions(roomId: string, messages: TimelineMessage[]): TimelineMessage[] {
  const existing = useMessagesStore.getState().getTimeline(roomId)
  if (existing.length === 0)
    return messages

  const existingReactions = new Map<string, Reaction[]>()
  for (const m of existing) {
    if (m.reactions && m.reactions.length > 0) {
      existingReactions.set(m.eventId, m.reactions)
    }
  }

  if (existingReactions.size === 0)
    return messages

  return messages.map((m) => {
    const storeReactions = existingReactions.get(m.eventId)
    if (!storeReactions)
      return m
    // If SDK already provided reactions, prefer them (they include server state);
    // otherwise use the store reactions from live sync
    if (m.reactions && m.reactions.length > 0)
      return m
    return { ...m, reactions: storeReactions }
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
    const messages = mergeStoreReactions(
      roomId,
      applyReactionsToMessages(
        events
          .filter(e => e.getType() === 'm.room.message')
          .map(e => matrixEventToTimelineMessage(e, client)),
        events,
      ),
    )

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

  // Skip if timeline already loaded (avoid overwriting live-sync reactions)
  const store = useMessagesStore.getState()
  if ((store.timelines.get(roomId)?.length ?? 0) > 0)
    return

  const timeline = room.getLiveTimeline()
  const events = timeline.getEvents()
  const messages = applyReactionsToMessages(
    events
      .filter(e => e.getType() === 'm.room.message')
      .map(e => matrixEventToTimelineMessage(e, client)),
    events,
  )

  const hasMore = timeline.getPaginationToken(Direction.Backward) !== null
  store.setTimeline(roomId, messages, hasMore)
}
