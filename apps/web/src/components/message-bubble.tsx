import type { ReceiptInfo, TimelineMessageItem } from '@matrix-web/matrix-client'
import { useAuthStore } from '@matrix-web/matrix-client'
import { AlertCircle, Check, CheckCheck, Clock, MessageSquare } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { MediaMessage } from './media-message'
import { MessageActionChevron, MessageReactionButton } from './message-actions'
import { MessageContent } from './message-content'
import { ReactionBar } from './reaction-bar'
import { StickerMessage } from './sticker-message'
import { UrlPreviewCards } from './url-preview-card'

interface MessageBubbleProps {
  message: TimelineMessageItem
  collapsed?: boolean
  receipts?: ReceiptInfo[]
  isPinned?: boolean
  onResend?: (eventId: string) => void
  onReaction?: (eventId: string, emoji: string) => void
  onEdit?: (message: TimelineMessageItem) => void
  onDelete?: (message: TimelineMessageItem) => void
  onReply?: (message: TimelineMessageItem) => void
  onThread?: (eventId: string) => void
  onPin?: (eventId: string) => void
  onReport?: (eventId: string) => void
  onJumpToEvent?: (eventId: string) => void
  highlighted?: boolean
}

// ---------------------------------------------------------------------------
// Check-mark status (WhatsApp-style)
// ---------------------------------------------------------------------------

function MessageStatus({ status, hasReceipts }: { status: TimelineMessageItem['status'], hasReceipts: boolean }) {
  switch (status) {
    case 'sending':
      return <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
    case 'sent':
      if (hasReceipts)
        return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
      return <Check className="h-3.5 w-3.5 text-muted-foreground/70" />
    case 'failed':
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ReplyPreview({ replyTo, isSelf, onJump }: {
  replyTo: NonNullable<TimelineMessageItem['replyTo']>
  isSelf: boolean
  onJump?: (eventId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onJump?.(replyTo.eventId)}
      className={cn(
        'mb-1 flex w-full flex-col rounded-md px-2.5 py-1.5 text-left transition-colors',
        'border-l-3',
        isSelf
          ? 'border-primary/50 bg-primary/10 hover:bg-primary/20'
          : 'border-primary/50 bg-accent/40 hover:bg-accent/60',
      )}
    >
      <span className={cn('text-xs font-semibold', 'text-primary')}>
        {replyTo.senderName || replyTo.senderId}
      </span>
      <span className={cn('truncate text-xs', 'text-muted-foreground')}>
        {replyTo.body || '...'}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Inline timestamp + status (sits at end of last text line)
// ---------------------------------------------------------------------------

function BubbleMeta({ time, isSelf, status, hasReceipts, edited, t }: {
  time: string
  isSelf: boolean
  status: TimelineMessageItem['status']
  hasReceipts: boolean
  edited: boolean
  t: (key: string) => string
}) {
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none',
      'text-muted-foreground',
    )}
    >
      {edited && <span>{`(${t('message.edited')})`}</span>}
      <span>{time}</span>
      {isSelf && <MessageStatus status={status} hasReceipts={hasReceipts} />}
    </span>
  )
}

// ---------------------------------------------------------------------------
// MessageBubble (WhatsApp-style)
// ---------------------------------------------------------------------------

export function MessageBubble({
  message,
  collapsed,
  receipts,
  isPinned,
  onResend,
  onReaction,
  onEdit,
  onDelete,
  onReply,
  onThread,
  onPin,
  onReport,
  onJumpToEvent,
  highlighted,
}: MessageBubbleProps) {
  const { t } = useTranslation()
  const userId = useAuthStore(s => s.session?.userId)
  const isSelf = message.senderId === userId
  const isEmote = message.msgtype === 'm.emote'
  const isSticker = message.type === 'm.sticker' || message.msgtype === 'm.sticker'
  const isMedia = ['m.image', 'm.video', 'm.file', 'm.audio'].includes(message.msgtype)
  const isVisualMedia = ['m.image', 'm.video'].includes(message.msgtype)
  const hasReceipts = (receipts?.length ?? 0) > 0

  const timeStr = useMemo(() => formatTime(message.timestamp), [message.timestamp])

  const handleReaction = useCallback((emoji: string) => {
    onReaction?.(message.eventId, emoji)
  }, [message.eventId, onReaction])

  const handleEdit = useCallback(() => {
    onEdit?.(message)
  }, [message, onEdit])

  const handleDelete = useCallback(() => {
    onDelete?.(message)
  }, [message, onDelete])

  const handleReply = useCallback(() => {
    onReply?.(message)
  }, [message, onReply])

  const handleThread = useCallback(() => {
    onThread?.(message.eventId)
  }, [message.eventId, onThread])

  const handlePin = useCallback(() => {
    onPin?.(message.eventId)
  }, [message.eventId, onPin])

  const handleReport = useCallback(() => {
    onReport?.(message.eventId)
  }, [message.eventId, onReport])

  const handleCopy = useCallback(() => {
    if (message.body) {
      navigator.clipboard.writeText(message.body)
    }
  }, [message.body])

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [chevronOpen, setChevronOpen] = useState(false)

  const canAct = message.status === 'sent' && onReaction

  // Chevron dropdown — inside bubble
  const chevron = canAct
    ? (
        <MessageActionChevron
          isSelf={isSelf}
          isPinned={isPinned}
          onEdit={isSelf && onEdit ? handleEdit : undefined}
          onDelete={isSelf && onDelete ? handleDelete : undefined}
          onReply={onReply ? handleReply : undefined}
          onThread={onThread ? handleThread : undefined}
          onPin={onPin ? handlePin : undefined}
          onReport={!isSelf && onReport ? handleReport : undefined}
          onCopy={message.body ? handleCopy : undefined}
          onOpenChange={setChevronOpen}
        />
      )
    : null

  // Emoji reaction button — outside bubble
  const emojiButton = canAct
    ? (
        <div className={cn(
          'absolute top-1/2 -translate-y-1/2 z-30',
          // Stay visible when picker is open, otherwise show on hover
          emojiPickerOpen ? 'block' : 'hidden group-hover/bubble:block',
          isSelf ? 'left-0 -translate-x-full pl-2' : 'right-0 translate-x-full pr-2',
        )}
        >
          <MessageReactionButton onReaction={handleReaction} onOpenChange={setEmojiPickerOpen} align={isSelf ? 'end' : 'start'} />
        </div>
      )
    : null

  // ---- Redacted message ----
  if (message.redacted) {
    return (
      <div className={cn('flex px-6 py-0.5', isSelf ? 'justify-end' : 'justify-start')}>
        <div className={cn(
          'max-w-[75%] rounded-2xl px-3 py-1.5 opacity-50',
          isSelf ? 'bg-primary/10' : 'bg-muted',
        )}
        >
          <p className="text-sm italic text-muted-foreground">{t('message.deleted')}</p>
          <div className="flex justify-end">
            <BubbleMeta time={timeStr} isSelf={isSelf} status={message.status} hasReceipts={hasReceipts} edited={false} t={t} />
          </div>
        </div>
      </div>
    )
  }

  // ---- Emote message ----
  if (isEmote) {
    return (
      <div className="group relative px-6 py-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-sm italic text-muted-foreground">
            *
            {' '}
            {message.senderName}
            {' '}
            {message.body}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
          {isSelf && <MessageStatus status={message.status} hasReceipts={hasReceipts} />}
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <ReactionBar reactions={message.reactions} onToggle={handleReaction} />
        )}
      </div>
    )
  }

  // ---- Sticker message (no bubble) ----
  if (isSticker) {
    return (
      <div
        className={cn(
          'group relative flex px-6 transition-colors duration-500 hover:z-20',
          collapsed ? 'py-0.5' : 'py-1.5',
          isSelf ? 'justify-end' : 'justify-start',
          highlighted && 'bg-primary/10',
        )}
      >
        {!isSelf && !collapsed && (
          <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {message.senderName.charAt(0).toUpperCase()}
          </div>
        )}
        {!isSelf && collapsed && <div className="mr-2 w-7 shrink-0" />}

        <div className="relative max-w-[75%] group/bubble">
          {!isSelf && !collapsed && (
            <p className="mb-0.5 text-xs font-semibold text-primary">{message.senderName}</p>
          )}

          <StickerMessage message={message} />

          <div className={cn('flex items-center gap-0.5 pt-0.5', isSelf ? 'justify-end' : 'justify-start')}>
            <BubbleMeta time={timeStr} isSelf={isSelf} status={message.status} hasReceipts={hasReceipts} edited={false} t={t} />
          </div>

          {message.reactions && message.reactions.length > 0 && (
            <ReactionBar reactions={message.reactions} onToggle={handleReaction} />
          )}

          {message.status === 'failed' && onResend && (
            <button
              type="button"
              className="mt-1 text-xs text-destructive hover:underline"
              onClick={() => onResend(message.eventId)}
            >
              {t('chat.failed_to_send')}
            </button>
          )}

          {emojiButton}
        </div>
      </div>
    )
  }

  // ---- Normal / media message (bubble) ----
  const bubbleBg = isSelf
    ? 'bg-primary/15 text-foreground'
    : 'bg-muted text-foreground'

  const bubbleRadius = isSelf
    ? collapsed ? 'rounded-2xl' : 'rounded-2xl rounded-tr-sm'
    : collapsed ? 'rounded-2xl' : 'rounded-2xl rounded-tl-sm'

  return (
    <div
      className={cn(
        'group relative flex px-6 transition-colors duration-500 hover:z-20',
        collapsed ? 'py-0.5' : 'py-1.5',
        isSelf ? 'justify-end' : 'justify-start',
        highlighted && 'bg-primary/10',
      )}
    >
      {/* Avatar — only for others, only when not collapsed */}
      {!isSelf && !collapsed && (
        <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {message.senderName.charAt(0).toUpperCase()}
        </div>
      )}
      {!isSelf && collapsed && <div className="mr-2 w-7 shrink-0" />}

      <div className={cn('relative max-w-[75%]', 'group/bubble')}>
        {isVisualMedia
          ? (
        /* Image/Video bubble — no padding, timestamp + chevron overlay */
              <div className={cn('relative inline-block overflow-hidden leading-[0]', bubbleRadius)}>
                {/* Sender name — overlay top-left */}
                {!isSelf && !collapsed && (
                  <p className="absolute top-1 left-2 z-10 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">{message.senderName}</p>
                )}

                {/* Media content */}
                <MediaMessage message={message} />

                {/* Chevron dropdown — overlay top-right */}
                {chevron && (
                  <span className={cn('absolute top-1 right-1 z-10 rounded-sm bg-black/40 px-0.5 backdrop-blur-sm [&_button]:text-white/80 [&_button:hover]:text-white', chevronOpen ? 'inline-flex' : 'hidden group-hover/bubble:inline-flex')}>
                    {chevron}
                  </span>
                )}

                {/* Timestamp — overlay bottom-right */}
                <div className="absolute bottom-1 right-2 z-10">
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] leading-none text-white backdrop-blur-sm">
                    {message.edited && <span>{`(${t('message.edited')})`}</span>}
                    <span>{timeStr}</span>
                    {isSelf && <MessageStatus status={message.status} hasReceipts={hasReceipts} />}
                  </span>
                </div>

                {/* Emoji reaction button */}
                {emojiButton}
              </div>
            )
          : (
        /* Text bubble */
              <div className={cn('relative min-w-[80px] px-2.5 pb-1.5 pt-1.5', bubbleBg, bubbleRadius)}>
                {/* Sender name — only for others, only when not collapsed */}
                {!isSelf && !collapsed && (
                  <p className="mb-0.5 text-xs font-semibold text-primary">{message.senderName}</p>
                )}

                {/* Reply preview */}
                {message.replyTo && (
                  <ReplyPreview replyTo={message.replyTo} isSelf={isSelf} onJump={onJumpToEvent} />
                )}

                {/* Chevron dropdown — inside bubble, top-right */}
                {chevron && (
                  <span className={cn(
                    'absolute top-1 right-1 z-10',
                    chevronOpen ? 'inline-flex' : 'hidden group-hover/bubble:inline-flex',
                    isSelf
                      ? 'bg-gradient-to-l from-primary/15 via-primary/10 to-transparent pl-4 pr-0.5 rounded-sm'
                      : 'bg-gradient-to-l from-muted via-muted/90 to-transparent pl-4 pr-0.5 rounded-sm',
                  )}
                  >
                    {chevron}
                  </span>
                )}

                {/* Content */}
                {isMedia
                  ? (
                      <>
                        <MediaMessage message={message} />
                        <div className="flex items-center justify-end gap-0.5 pt-0.5">
                          <BubbleMeta time={timeStr} isSelf={isSelf} status={message.status} hasReceipts={hasReceipts} edited={message.edited} t={t} />
                        </div>
                      </>
                    )
                  : (
                      <>
                        <div className="pb-3.5">
                          <MessageContent message={message} />
                        </div>
                        <span className="absolute bottom-1 right-2">
                          <BubbleMeta time={timeStr} isSelf={isSelf} status={message.status} hasReceipts={hasReceipts} edited={message.edited} t={t} />
                        </span>
                      </>
                    )}

                {/* Emoji reaction button */}
                {emojiButton}
              </div>
            )}

        {/* URL preview — outside bubble */}
        {!isMedia && message.msgtype === 'm.text' && message.body && (
          <UrlPreviewCards body={message.body} />
        )}

        {/* Thread */}
        {message.isThreadRoot && (message.threadReplyCount ?? 0) > 0 && onThread && (
          <button
            type="button"
            onClick={handleThread}
            className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            {t('chat.thread_replies', { count: message.threadReplyCount })}
          </button>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <ReactionBar reactions={message.reactions} onToggle={handleReaction} />
        )}

        {/* Failed */}
        {message.status === 'failed' && onResend && (
          <button
            type="button"
            className="mt-1 text-xs text-destructive hover:underline"
            onClick={() => onResend(message.eventId)}
          >
            {t('chat.failed_to_send')}
          </button>
        )}
      </div>
    </div>
  )
}
