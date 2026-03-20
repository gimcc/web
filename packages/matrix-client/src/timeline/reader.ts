import type { MatrixClient, MatrixEvent } from 'matrix-js-sdk'
import { Direction } from 'matrix-js-sdk'
import type { Reaction, ReplyTo, TimelineMessage } from '../stores/messages-store'
import type { DayDividerItem, TimelineItem, TimelineMemberItem, TimelineMessageItem, TimelineStateItem, UnreadDividerItem } from './types'

// ---------------------------------------------------------------------------
// Timeline reader — builds a renderable TimelineItem[] from SDK + optimistic
// ---------------------------------------------------------------------------

const RE_MX_REPLY = /<mx-reply>[\s\S]*?<\/mx-reply>/i

/** Read reactions for an event from SDK Relations */
function readReactions(room: ReturnType<MatrixClient['getRoom']>, eventId: string): Reaction[] {
  if (!room) return []
  let relations: any
  try {
    relations = room.relations.getChildEventsForEvent(eventId, 'm.annotation', 'm.reaction')
  }
  catch {
    return []
  }
  if (!relations) return []

  const sorted: Array<[string, Set<MatrixEvent>]> = relations.getSortedAnnotationsByKey() ?? []
  return sorted.map(([key, events]) => {
    const senderIds: string[] = []
    const eventIds: Record<string, string> = {}
    for (const e of events) {
      const sender = e.getSender()
      const eid = e.getId()
      if (sender && eid && !senderIds.includes(sender)) {
        senderIds.push(sender)
        eventIds[sender] = eid
      }
    }
    return { emoji: key, senderIds, eventIds }
  })
}

/** Convert a single SDK MatrixEvent to a TimelineMessageItem (no collapse yet) */
function eventToMessageItem(event: MatrixEvent, client: MatrixClient): TimelineMessageItem {
  const content = event.getContent()
  const sender = event.getSender() ?? ''
  const roomId = event.getRoomId() ?? ''
  const room = client.getRoom(roomId)
  const member = room?.getMember(sender)

  // Handle edits
  const effectiveContent = content['m.new_content'] ?? content
  const isEdited = !!content['m.new_content']

  // Parse reply-to
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

  // Strip reply fallback
  let body = effectiveContent.body ?? ''
  let formattedBody = effectiveContent.formatted_body
  if (replyTo && body.startsWith('> ')) {
    const lines = body.split('\n')
    const idx = lines.findIndex((l: string) => !l.startsWith('> ') && l !== '')
    if (idx > 0) body = lines.slice(idx).join('\n').trim()
  }
  if (formattedBody && replyTo) {
    formattedBody = formattedBody.replace(RE_MX_REPLY, '').trim()
  }

  // Thread info
  const relatesTo = content['m.relates_to']
  const threadRootId = relatesTo?.rel_type === 'm.thread' ? relatesTo.event_id : undefined

  // Check if this event is a thread root
  const eventId = event.getId() ?? ''
  const thread = room?.getThread(eventId)
  const isThreadRoot = thread != null
  const threadReplyCount = thread?.length ?? 0

  // Reactions from SDK Relations
  const reactions = readReactions(room, eventId)

  return {
    kind: 'message',
    key: eventId,
    eventId,
    roomId,
    senderId: sender,
    senderName: member?.name ?? sender,
    type: event.getType(),
    msgtype: effectiveContent.msgtype ?? '',
    body,
    formattedBody: formattedBody || undefined,
    timestamp: event.getTs(),
    status: 'sent',
    reactions,
    edited: isEdited,
    redacted: event.isRedacted(),
    replyTo,
    url: effectiveContent.url,
    thumbnailUrl: effectiveContent.info?.thumbnail_url,
    info: effectiveContent.info,
    filename: effectiveContent.filename ?? effectiveContent.body,
    threadRootId,
    isThreadRoot,
    threadReplyCount: isThreadRoot ? threadReplyCount : undefined,
    collapsed: false,
  }
}

/** Convert a member event to a TimelineMemberItem */
function eventToMemberItem(event: MatrixEvent, client: MatrixClient): TimelineMemberItem | null {
  const content = event.getContent()
  const prev = event.getPrevContent()
  const membership = content.membership as string | undefined
  const prevMembership = prev.membership as string | undefined

  if (!membership) return null

  const senderId = event.getSender() ?? ''
  const targetId = event.getStateKey() ?? senderId
  const room = client.getRoom(event.getRoomId() ?? '')
  const senderMember = room?.getMember(senderId)
  const targetMember = room?.getMember(targetId)

  return {
    kind: 'member-event',
    key: event.getId() ?? `member-${event.getTs()}`,
    eventId: event.getId() ?? '',
    timestamp: event.getTs(),
    senderId,
    senderName: senderMember?.name ?? senderId,
    targetId,
    targetName: content.displayname ?? targetMember?.name ?? targetId,
    membership,
    prevMembership,
  }
}

/** Convert a state event (name/topic/encryption change) to a TimelineStateItem */
function eventToStateItem(event: MatrixEvent, client: MatrixClient): TimelineStateItem | null {
  const senderId = event.getSender() ?? ''
  const room = client.getRoom(event.getRoomId() ?? '')
  const member = room?.getMember(senderId)
  const senderName = member?.name ?? senderId
  const content = event.getContent()
  const type = event.getType()

  let description: string
  switch (type) {
    case 'm.room.name':
      description = `${senderName} changed the room name to "${content.name ?? ''}"`
      break
    case 'm.room.topic':
      description = `${senderName} changed the room topic`
      break
    case 'm.room.avatar':
      description = `${senderName} changed the room avatar`
      break
    case 'm.room.encryption':
      description = `${senderName} enabled end-to-end encryption`
      break
    case 'm.room.power_levels':
      description = `${senderName} changed the room power levels`
      break
    default:
      description = `${senderName} sent a ${type} event`
  }

  return {
    kind: 'state-event',
    key: event.getId() ?? `state-${event.getTs()}`,
    eventId: event.getId() ?? '',
    timestamp: event.getTs(),
    senderId,
    senderName,
    stateType: type,
    description,
  }
}

/** Check if an event is a reaction or edit (should not be rendered as standalone) */
function isRelationEvent(event: MatrixEvent): boolean {
  const content = event.getContent()
  const relatesTo = content['m.relates_to']
  if (!relatesTo) return false
  const relType = relatesTo.rel_type
  return relType === 'm.annotation' || relType === 'm.replace'
}

/** State event types that should be rendered in the timeline */
const RENDERED_STATE_EVENTS = new Set([
  'm.room.name',
  'm.room.topic',
  'm.room.avatar',
  'm.room.encryption',
])

/** Convert a single SDK event to a timeline item (or null if skipped) */
function convertEvent(event: MatrixEvent, client: MatrixClient): TimelineItem | null {
  const type = event.getType()

  // Skip redaction events themselves (the redacted event is marked separately)
  if (event.isRedaction()) return null

  // Skip relation events (reactions, edits) — they modify other events
  if (isRelationEvent(event)) return null

  // Member events
  if (type === 'm.room.member') {
    return eventToMemberItem(event, client)
  }

  // Rendered state events
  if (typeof event.getStateKey() === 'string' && RENDERED_STATE_EVENTS.has(type)) {
    return eventToStateItem(event, client)
  }

  // Message events (including m.sticker and decrypted messages)
  if (type === 'm.room.message' || type === 'm.sticker') {
    return eventToMessageItem(event, client)
  }

  // Skip everything else (including unknown state events, m.room.encrypted that failed to decrypt)
  return null
}

/** Convert an optimistic TimelineMessage to a TimelineMessageItem */
function optimisticToItem(msg: TimelineMessage): TimelineMessageItem {
  return {
    kind: 'message',
    key: msg.eventId,
    eventId: msg.eventId,
    roomId: msg.roomId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    type: msg.type,
    msgtype: msg.msgtype,
    body: msg.body,
    formattedBody: msg.formattedBody,
    timestamp: msg.timestamp,
    status: msg.status,
    reactions: msg.reactions ?? [],
    edited: msg.edited ?? false,
    redacted: msg.redacted ?? false,
    replyTo: msg.replyTo,
    url: msg.url,
    thumbnailUrl: msg.thumbnailUrl,
    info: msg.info,
    filename: msg.filename,
    threadRootId: msg.threadRootId,
    threadReplyCount: msg.threadReplyCount,
    isThreadRoot: msg.isThreadRoot,
    collapsed: false,
  }
}

// ---------------------------------------------------------------------------
// Grouping & dividers
// ---------------------------------------------------------------------------

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1)
  const d2 = new Date(ts2)
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
}

function isToday(ts: number): boolean {
  return isSameDay(ts, Date.now())
}

function isYesterday(ts: number): boolean {
  const yesterday = Date.now() - 86400000
  return isSameDay(ts, yesterday)
}

function formatDayLabel(ts: number): string {
  if (isToday(ts)) return 'Today'
  if (isYesterday(ts)) return 'Yesterday'
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const COLLAPSE_THRESHOLD_MS = 2 * 60 * 1000

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addGroupingAndDividers(
  items: TimelineItem[],
  readUpToEventId?: string,
): TimelineItem[] {
  const result: TimelineItem[] = []
  let prevMessage: TimelineMessageItem | null = null
  let unreadInserted = false

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!

    // Day divider: check if previous item is on a different day
    if (i > 0) {
      const prevTs = items[i - 1]!.timestamp
      if (!isSameDay(prevTs, item.timestamp)) {
        const dayTs = startOfDay(item.timestamp)
        const divider: DayDividerItem = {
          kind: 'day-divider',
          key: `day-${dayTs}`,
          timestamp: item.timestamp,
          label: formatDayLabel(item.timestamp),
        }
        result.push(divider)
      }
    }
    else {
      // First item — always add a day divider
      const dayTs = startOfDay(item.timestamp)
      const divider: DayDividerItem = {
        kind: 'day-divider',
        key: `day-${dayTs}`,
        timestamp: item.timestamp,
        label: formatDayLabel(item.timestamp),
      }
      result.push(divider)
    }

    // Unread divider: insert after the read-up-to event
    if (!unreadInserted && readUpToEventId && i > 0) {
      const prevItem = items[i - 1]!
      const prevEventId = 'eventId' in prevItem ? prevItem.eventId : undefined
      if (prevEventId === readUpToEventId) {
        const divider: UnreadDividerItem = {
          kind: 'unread-divider',
          key: 'unread-divider',
          timestamp: item.timestamp,
        }
        result.push(divider)
        unreadInserted = true
      }
    }

    // Message collapse (grouping)
    if (item.kind === 'message' && !item.redacted) {
      const shouldCollapse: boolean = prevMessage != null
        && prevMessage.senderId === item.senderId
        && prevMessage.type === item.type
        && (item.timestamp - prevMessage.timestamp) < COLLAPSE_THRESHOLD_MS
        && isSameDay(prevMessage.timestamp, item.timestamp)
      const finalItem: TimelineMessageItem = shouldCollapse ? { ...item, collapsed: true } : item
      prevMessage = finalItem
      result.push(finalItem)
    }
    else {
      // Non-message items break the collapse chain
      prevMessage = null
      result.push(item)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface ReadTimelineOptions {
  /** Optimistic messages to merge (sending/failed) */
  optimistic?: TimelineMessage[]
  /** Event ID of last read message (for unread divider) */
  readUpToEventId?: string
  /** Optimistic reactions overlay: Map<targetEventId, Reaction[]> */
  optimisticReactions?: Map<string, Reaction[]>
}

/**
 * Build the full renderable timeline for a room by reading directly from SDK.
 * Merges optimistic messages and adds grouping/dividers.
 */
export function readTimeline(
  client: MatrixClient | null,
  roomId: string,
  options: ReadTimelineOptions = {},
): TimelineItem[] {
  if (!client) return []

  const room = client.getRoom(roomId)
  if (!room) return []

  const timeline = room.getLiveTimeline()
  const events = timeline.getEvents()

  // Convert SDK events to timeline items
  const items: TimelineItem[] = []
  for (const event of events) {
    const item = convertEvent(event, client)
    if (item) items.push(item)
  }

  // Merge optimistic messages (append at the end, they have latest timestamps)
  if (options.optimistic && options.optimistic.length > 0) {
    for (const msg of options.optimistic) {
      items.push(optimisticToItem(msg))
    }
  }

  // Apply optimistic reactions overlay
  if (options.optimisticReactions && options.optimisticReactions.size > 0) {
    for (const item of items) {
      if (item.kind === 'message') {
        const overlay = options.optimisticReactions.get(item.eventId)
        if (overlay) {
          item.reactions = mergeReactions(item.reactions, overlay)
        }
      }
    }
  }

  // Sort by timestamp (optimistic messages should be at the right position)
  items.sort((a, b) => a.timestamp - b.timestamp)

  // Add grouping and dividers
  return addGroupingAndDividers(items, options.readUpToEventId)
}

/** Merge SDK reactions with optimistic overlay */
function mergeReactions(sdkReactions: Reaction[], overlay: Reaction[]): Reaction[] {
  const merged = new Map<string, Reaction>()

  for (const r of sdkReactions) {
    merged.set(r.emoji, { ...r })
  }

  for (const r of overlay) {
    const existing = merged.get(r.emoji)
    if (existing) {
      const allSenders = new Set([...existing.senderIds, ...r.senderIds])
      merged.set(r.emoji, {
        emoji: r.emoji,
        senderIds: [...allSenders],
        eventIds: { ...existing.eventIds, ...r.eventIds },
      })
    }
    else {
      merged.set(r.emoji, { ...r })
    }
  }

  return [...merged.values()]
}

/**
 * Check if the room has more history to load (has backward pagination token).
 */
export function roomHasMoreHistory(client: MatrixClient | null, roomId: string): boolean {
  if (!client) return false
  const room = client.getRoom(roomId)
  if (!room) return false
  const timeline = room.getLiveTimeline()
  return timeline.getPaginationToken(Direction.Backward) !== null
}

/**
 * Paginate backward (load older messages) via SDK scrollback.
 */
export async function paginateBackward(client: MatrixClient, roomId: string, limit = 30): Promise<boolean> {
  const room = client.getRoom(roomId)
  if (!room) return false

  await client.scrollback(room, limit)
  const timeline = room.getLiveTimeline()
  return timeline.getPaginationToken(Direction.Backward) !== null
}
