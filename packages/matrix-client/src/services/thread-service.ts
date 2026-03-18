import type { TimelineMessage } from '../stores/messages-store'
import { EventType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useMessagesStore } from '../stores/messages-store'
import { useThreadsStore } from '../stores/threads-store'
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
        'm.in_reply_to': {
          event_id: threadRootId,
        },
      },
    }

    const response = await client.sendEvent(roomId, EventType.RoomMessage, content as any)

    // Update optimistic message with confirmed event ID
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

    // Increment reply count on the root message in main timeline
    updateThreadReplyCount(roomId, threadRootId, 1)
  }
  catch {
    // Mark as failed
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

  // Get the root message from main timeline
  const rootMessage = useMessagesStore.getState().getTimeline(roomId).find(m => m.eventId === threadRootId)

  // Find thread replies from the room timeline events
  const events = room.getLiveTimeline().getEvents()
  const threadMessages: TimelineMessage[] = []

  // Add root message first
  if (rootMessage) {
    threadMessages.push({ ...rootMessage, isThreadRoot: true })
  }

  // Gather replies that are part of this thread
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

  // Sort by timestamp
  threadMessages.sort((a, b) => a.timestamp - b.timestamp)

  useThreadsStore.getState().setThreadMessages(threadRootId, threadMessages)
}

function updateThreadReplyCount(roomId: string, threadRootId: string, delta: number): void {
  const store = useMessagesStore.getState()
  const timeline = store.getTimeline(roomId)
  const rootIdx = timeline.findIndex(m => m.eventId === threadRootId)
  if (rootIdx === -1)
    return

  const root = timeline[rootIdx]!
  const updated = { ...root, threadReplyCount: (root.threadReplyCount ?? 0) + delta, isThreadRoot: true }
  const newTimeline = [...timeline]
  newTimeline[rootIdx] = updated
  store.setTimeline(roomId, newTimeline, store.hasMore.get(roomId) ?? false)
}

export function handleThreadEvent(roomId: string, threadRootId: string): void {
  updateThreadReplyCount(roomId, threadRootId, 1)
}
