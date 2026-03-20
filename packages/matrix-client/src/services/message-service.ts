import type { ISendEventResponse, MatrixClient, MatrixEvent } from 'matrix-js-sdk'
import type { ReplyTo, TimelineMessage } from '../stores/messages-store'
import { EventType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useTimelineStore } from '../stores/timeline-store'
import { paginateBackward, roomHasMoreHistory } from '../timeline/reader'

type SendEventFn = (roomId: string, eventType: string, content: Record<string, unknown>) => Promise<ISendEventResponse>

function getSendEventFn(client: MatrixClient): SendEventFn {
  return client.sendEvent.bind(client) as SendEventFn
}

const RE_AMP = /&/g
const RE_LT = /</g
const RE_GT = />/g
const RE_QUOT = /"/g

function escapeHtml(str: string): string {
  return str.replace(RE_AMP, '&amp;').replace(RE_LT, '&lt;').replace(RE_GT, '&gt;').replace(RE_QUOT, '&quot;')
}

const RE_MX_REPLY = /<mx-reply>[\s\S]*?<\/mx-reply>/i

let tempIdCounter = 0

function generateTempEventId(): string {
  return `~local-${Date.now()}-${++tempIdCounter}`
}

/**
 * Convert a SDK MatrixEvent to a TimelineMessage.
 * Still used by thread-service and pin-service.
 */
export function matrixEventToTimelineMessage(event: MatrixEvent, client: MatrixClient): TimelineMessage {
  const content = event.getContent()
  const sender = event.getSender() ?? ''
  const room = client.getRoom(event.getRoomId() ?? '')
  const member = room?.getMember(sender)

  const effectiveContent = content['m.new_content'] ?? content
  const isEdited = !!content['m.new_content']

  let replyTo: ReplyTo | undefined
  const inReplyTo = content['m.relates_to']?.['m.in_reply_to']
  if (inReplyTo?.event_id && room) {
    const replyEvent = room.findEventById(inReplyTo.event_id)
    if (replyEvent) {
      const replySender = replyEvent.getSender() ?? ''
      const replyMember = room.getMember(replySender)
      replyTo = {
        eventId: inReplyTo.event_id,
        senderId: replySender,
        senderName: replyMember?.name ?? replySender,
        body: replyEvent.getContent()?.body ?? '',
      }
    }
    else {
      replyTo = { eventId: inReplyTo.event_id, senderId: '', senderName: '', body: '' }
    }
  }

  let body = effectiveContent.body ?? ''
  let formattedBody = effectiveContent.formatted_body
  if (replyTo && body.startsWith('> ')) {
    const lines = body.split('\n')
    const nonQuoteIdx = lines.findIndex((l: string) => !l.startsWith('> ') && l !== '')
    if (nonQuoteIdx > 0)
      body = lines.slice(nonQuoteIdx).join('\n').trim()
  }
  if (formattedBody && replyTo) {
    formattedBody = formattedBody.replace(RE_MX_REPLY, '').trim()
  }

  return {
    eventId: event.getId() ?? '',
    roomId: event.getRoomId() ?? '',
    senderId: sender,
    senderName: member?.name ?? sender,
    type: event.getType(),
    msgtype: effectiveContent.msgtype ?? '',
    body,
    formattedBody: formattedBody || undefined,
    timestamp: event.getTs(),
    status: 'sent',
    edited: isEdited,
    redacted: event.isRedacted(),
    replyTo,
    url: effectiveContent.url,
    thumbnailUrl: effectiveContent.info?.thumbnail_url,
    info: effectiveContent.info,
    filename: effectiveContent.filename ?? effectiveContent.body,
  }
}

// ---------------------------------------------------------------------------
// Send operations — use useTimelineStore for optimistic messages
// ---------------------------------------------------------------------------

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

  useTimelineStore.getState().addOptimistic(optimistic)

  try {
    const content = {
      msgtype,
      body,
      ...(options?.formattedBody
        ? { format: 'org.matrix.custom.html', formatted_body: options.formattedBody }
        : {}),
    }
    const response = await getSendEventFn(client)(roomId, EventType.RoomMessage, content as Record<string, unknown>)
    useTimelineStore.getState().confirmOptimistic(roomId, tempEventId, response.event_id)
  }
  catch {
    useTimelineStore.getState().failOptimistic(roomId, tempEventId)
  }
}

export async function editMessage(
  roomId: string,
  eventId: string,
  newBody: string,
  options?: { formattedBody?: string },
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const content: Record<string, unknown> = {
    'msgtype': 'm.text',
    'body': `* ${newBody}`,
    'm.new_content': {
      msgtype: 'm.text',
      body: newBody,
      ...(options?.formattedBody
        ? { format: 'org.matrix.custom.html', formatted_body: options.formattedBody }
        : {}),
    },
    'm.relates_to': {
      rel_type: 'm.replace',
      event_id: eventId,
    },
  }

  await getSendEventFn(client)(roomId, EventType.RoomMessage, content as Record<string, unknown>)
  // The edit will be picked up by SDK and reflected on next version bump
  useTimelineStore.getState().bumpVersion(roomId)
}

export async function deleteMessage(
  roomId: string,
  eventId: string,
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  await client.redactEvent(roomId, eventId)
  // The redaction will be picked up by SDK and reflected on next version bump
  useTimelineStore.getState().bumpVersion(roomId)
}

export async function sendReply(
  roomId: string,
  replyToEventId: string,
  replyToSender: string,
  replyToBody: string,
  body: string,
  options?: { formattedBody?: string },
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const tempEventId = generateTempEventId()
  const userId = client.getUserId() ?? ''
  const room = client.getRoom(roomId)
  const member = room?.getMember(userId)
  const replyToMember = room?.getMember(replyToSender)
  const replyToDisplayName = replyToMember?.name ?? replyToSender

  const optimistic: TimelineMessage = {
    eventId: tempEventId,
    roomId,
    senderId: userId,
    senderName: member?.name ?? userId,
    type: 'm.room.message',
    msgtype: 'm.text',
    body,
    formattedBody: options?.formattedBody,
    timestamp: Date.now(),
    status: 'sending',
    replyTo: {
      eventId: replyToEventId,
      senderId: replyToSender,
      senderName: replyToDisplayName,
      body: replyToBody,
    },
  }

  useTimelineStore.getState().addOptimistic(optimistic)

  try {
    const fallbackHtml = `<mx-reply><blockquote><a href="https://matrix.to/#/${escapeHtml(roomId)}/${escapeHtml(replyToEventId)}">In reply to</a> <a href="https://matrix.to/#/${escapeHtml(replyToSender)}">${escapeHtml(replyToDisplayName)}</a><br/>${escapeHtml(replyToBody)}</blockquote></mx-reply>${options?.formattedBody ?? escapeHtml(body)}`

    const content: Record<string, unknown> = {
      'msgtype': 'm.text',
      'body': `> <${replyToSender}> ${replyToBody}\n\n${body}`,
      'format': 'org.matrix.custom.html',
      'formatted_body': fallbackHtml,
      'm.relates_to': {
        'm.in_reply_to': { event_id: replyToEventId },
      },
    }

    const response = await getSendEventFn(client)(roomId, EventType.RoomMessage, content as Record<string, unknown>)
    useTimelineStore.getState().confirmOptimistic(roomId, tempEventId, response.event_id)
  }
  catch {
    useTimelineStore.getState().failOptimistic(roomId, tempEventId)
  }
}

export async function resendMessage(roomId: string, eventId: string): Promise<void> {
  const store = useTimelineStore.getState()
  const optimistic = store.optimistic.get(roomId) ?? []
  const message = optimistic.find(m => m.eventId === eventId)

  if (!message || message.status !== 'failed')
    return

  store.removeOptimistic(roomId, eventId)

  await sendTextMessage(roomId, message.body, {
    formattedBody: message.formattedBody,
    msgtype: message.msgtype,
  })
}

// ---------------------------------------------------------------------------
// Timeline loading — now just triggers SDK scrollback + version bump
// ---------------------------------------------------------------------------

/**
 * Initialize timeline for a room. Just sets hasMore and bumps version
 * so the reader re-reads from SDK.
 */
export function loadInitialTimeline(roomId: string): void {
  const client = getMatrixClient()
  if (!client)
    return

  const hasMore = roomHasMoreHistory(client, roomId)
  useTimelineStore.getState().setHasMore(roomId, hasMore)
  useTimelineStore.getState().bumpVersion(roomId)
}

/**
 * Load older messages via SDK scrollback, then bump version.
 */
export async function loadRoomHistory(roomId: string): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    return

  try {
    const hasMore = await paginateBackward(client, roomId, 30)
    useTimelineStore.getState().setHasMore(roomId, hasMore)
    useTimelineStore.getState().bumpVersion(roomId)
  }
  catch {
    useTimelineStore.getState().setHasMore(roomId, false)
  }
}
