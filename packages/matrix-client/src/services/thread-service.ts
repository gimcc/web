import type { ISendEventResponse, MatrixClient } from 'matrix-js-sdk'
import type { TimelineMessage } from '../stores/messages-store'
import { EventType } from 'matrix-js-sdk'

type SendEventFn = (roomId: string, eventType: string, content: Record<string, unknown>) => Promise<ISendEventResponse>

function getSendEventFn(client: MatrixClient): SendEventFn {
  return client.sendEvent.bind(client) as SendEventFn
}
import { getMatrixClient } from '../client/client-manager'
import { useThreadsStore } from '../stores/threads-store'
import { useTimelineStore } from '../stores/timeline-store'
import { matrixEventToTimelineMessage } from './message-service'

let tempIdCounter = 0

function generateTempEventId(): string {
  return `~thread-${Date.now()}-${++tempIdCounter}`
}

export async function sendThreadMessage(
  roomId: string,
  threadRootId: string,
  body: string,
  options?: { formattedBody?: string },
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const userId = client.getUserId() ?? ''
  const room = client.getRoom(roomId)
  const member = room?.getMember(userId)
  const tempEventId = generateTempEventId()

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
    threadRootId,
  }

  useThreadsStore.getState().appendThreadMessage(threadRootId, optimistic)

  try {
    const content: Record<string, unknown> = {
      'msgtype': 'm.text',
      body,
      ...(options?.formattedBody
        ? { format: 'org.matrix.custom.html', formatted_body: options.formattedBody }
        : {}),
      'm.relates_to': {
        'rel_type': 'm.thread',
        'event_id': threadRootId,
        'is_falling_back': true,
        'm.in_reply_to': { event_id: threadRootId },
      },
    }

    const response = await getSendEventFn(client)(roomId, EventType.RoomMessage, content as Record<string, unknown>)

    const threads = new Map(useThreadsStore.getState().threads)
    const threadMessages = threads.get(threadRootId)
    if (threadMessages) {
      threads.set(
        threadRootId,
        threadMessages.map(m =>
          m.eventId === tempEventId
            ? { ...m, eventId: response.event_id, status: 'sent' as const }
            : m,
        ),
      )
      useThreadsStore.getState().setThreadMessages(threadRootId, threads.get(threadRootId)!)
    }

    // Bump version so thread reply count is reflected in main timeline
    useTimelineStore.getState().bumpVersion(roomId)
  }
  catch {
    const threads = new Map(useThreadsStore.getState().threads)
    const threadMessages = threads.get(threadRootId)
    if (threadMessages) {
      useThreadsStore.getState().setThreadMessages(
        threadRootId,
        threadMessages.map(m =>
          m.eventId === tempEventId ? { ...m, status: 'failed' as const } : m,
        ),
      )
    }
  }
}

export function loadThreadTimeline(roomId: string, threadRootId: string): void {
  const client = getMatrixClient()
  if (!client)
    return

  const room = client.getRoom(roomId)
  if (!room)
    return

  // Find root message from SDK timeline
  const events = room.getLiveTimeline().getEvents()
  const rootEvent = events.find(e => e.getId() === threadRootId)
  const threadMessages: TimelineMessage[] = []

  if (rootEvent) {
    const rootMsg = matrixEventToTimelineMessage(rootEvent, client)
    rootMsg.isThreadRoot = true
    threadMessages.push(rootMsg)
  }

  // Gather thread replies
  for (const event of events) {
    if (event.getType() !== 'm.room.message')
      continue
    const content = event.getContent()
    const relatesTo = content['m.relates_to']
    if (relatesTo?.rel_type === 'm.thread' && relatesTo.event_id === threadRootId) {
      const msg = matrixEventToTimelineMessage(event, client)
      msg.threadRootId = threadRootId
      threadMessages.push(msg)
    }
  }

  threadMessages.sort((a, b) => a.timestamp - b.timestamp)
  useThreadsStore.getState().setThreadMessages(threadRootId, threadMessages)
}

/**
 * Called by sync-bridge when a thread reply arrives via sync.
 * Bumps version so thread reply count is visible in main timeline.
 */
export function handleThreadEvent(roomId: string, _threadRootId: string): void {
  // Thread reply count is now computed by the reader from SDK Relations,
  // so we just bump version to trigger a re-read.
  useTimelineStore.getState().bumpVersion(roomId)
}
