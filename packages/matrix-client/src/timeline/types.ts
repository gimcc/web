import type { Reaction, ReplyTo } from '../stores/messages-store'

// ---------------------------------------------------------------------------
// TimelineItem — discriminated union rendered by the timeline component.
// Messages keep the existing TimelineMessage shape so MessageBubble props are
// unchanged; non-message items use separate interfaces.
// ---------------------------------------------------------------------------

export type MessageStatus = 'sending' | 'sent' | 'failed'

export interface TimelineMessageItem {
  kind: 'message'
  key: string
  eventId: string
  roomId: string
  senderId: string
  senderName: string
  type: string
  msgtype: string
  body: string
  formattedBody?: string
  timestamp: number
  status: MessageStatus
  reactions: Reaction[]
  edited: boolean
  redacted: boolean
  replyTo?: ReplyTo
  url?: string
  thumbnailUrl?: string
  info?: {
    w?: number
    h?: number
    size?: number
    mimetype?: string
    duration?: number
    thumbnail_url?: string
    thumbnail_info?: { w?: number, h?: number, size?: number, mimetype?: string }
  }
  filename?: string
  threadRootId?: string
  threadReplyCount?: number
  isThreadRoot?: boolean
  /** True when consecutive messages from same sender within 2 min — hide avatar/name */
  collapsed: boolean
}

export interface TimelineMemberItem {
  kind: 'member-event'
  key: string
  eventId: string
  timestamp: number
  senderId: string
  senderName: string
  targetId: string
  targetName: string
  membership: string
  prevMembership?: string
}

export interface TimelineStateItem {
  kind: 'state-event'
  key: string
  eventId: string
  timestamp: number
  senderId: string
  senderName: string
  stateType: string
  description: string
}

export interface DayDividerItem {
  kind: 'day-divider'
  key: string
  timestamp: number
  label: string
}

export interface UnreadDividerItem {
  kind: 'unread-divider'
  key: string
  timestamp: number
}

export type TimelineItem
  = | TimelineMessageItem
    | TimelineMemberItem
    | TimelineStateItem
    | DayDividerItem
    | UnreadDividerItem
