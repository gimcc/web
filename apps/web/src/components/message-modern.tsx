import type { ReceiptInfo, TimelineMessageItem } from '@matrix-web/matrix-client'
import { useAuthStore } from '@matrix-web/matrix-client'
import { AlertCircle, Check, CheckCheck, Clock, MessageSquare } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { MediaMessage } from './media-message'
import { MessageActions } from './message-actions'
import { MessageContent } from './message-content'
import { ReactionBar } from './reaction-bar'
import { UrlPreviewCards } from './url-preview-card'

interface MessageModernProps {
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
  onJumpToEvent?: (eventId: string) => void
  highlighted?: boolean
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageModern({
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
  onJumpToEvent,
  highlighted,
}: MessageModernProps) {
  const { t } = useTranslation()
  const userId = useAuthStore(s => s.session?.userId)
  const isSelf = message.senderId === userId
  const isMedia = ['m.image', 'm.video', 'm.file', 'm.audio'].includes(message.msgtype)
  const hasReceipts = (receipts?.length ?? 0) > 0
  const timeStr = useMemo(() => formatTime(message.timestamp), [message.timestamp])

  const handleReaction = useCallback((emoji: string) => {
    onReaction?.(message.eventId, emoji)
  }, [message.eventId, onReaction])

  const handleEdit = useCallback(() => onEdit?.(message), [message, onEdit])
  const handleDelete = useCallback(() => onDelete?.(message), [message, onDelete])
  const handleReply = useCallback(() => onReply?.(message), [message, onReply])
  const handleThread = useCallback(() => onThread?.(message.eventId), [message.eventId, onThread])
  const handlePin = useCallback(() => onPin?.(message.eventId), [message.eventId, onPin])

  if (message.redacted) {
    return (
      <div className="px-4 py-1">
        <p className="text-sm italic text-muted-foreground">{t('message.deleted')}</p>
      </div>
    )
  }

  const actionBar = message.status === 'sent' && onReaction
    ? (
        <div className="absolute right-2 -top-3 hidden group-hover:block z-10">
          <MessageActions
            onReaction={handleReaction}
            isSelf={isSelf}
            isPinned={isPinned}
            onEdit={isSelf && onEdit ? handleEdit : undefined}
            onDelete={isSelf && onDelete ? handleDelete : undefined}
            onReply={onReply ? handleReply : undefined}
            onThread={onThread ? handleThread : undefined}
            onPin={onPin ? handlePin : undefined}
          />
        </div>
      )
    : null

  return (
    <div
      className={cn(
        'group relative flex gap-3 px-4 transition-colors hover:bg-accent/30',
        collapsed ? 'py-0.5' : 'py-2',
        highlighted && 'bg-primary/10',
      )}
    >
      {/* Avatar */}
      {!collapsed
        ? (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
              {message.senderName.charAt(0).toUpperCase()}
            </div>
          )
        : <div className="w-9 shrink-0" />}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        {!collapsed && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className={cn('text-sm font-semibold', isSelf ? 'text-primary' : 'text-foreground')}>
              {message.senderName}
            </span>
            <span className="text-[11px] text-muted-foreground">{timeStr}</span>
          </div>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <button
            type="button"
            onClick={() => onJumpToEvent?.(message.replyTo!.eventId)}
            className="mb-1 flex w-full items-center gap-1 rounded border-l-2 border-primary/50 bg-accent/40 px-2 py-1 text-left text-xs hover:bg-accent/60"
          >
            <span className="font-semibold text-primary">{message.replyTo.senderName || message.replyTo.senderId}</span>
            <span className="truncate text-muted-foreground">{message.replyTo.body || '...'}</span>
          </button>
        )}

        {/* Message body */}
        <div className="text-sm">
          {isMedia
            ? <MediaMessage message={message} />
            : <MessageContent message={message} />}
        </div>

        {/* URL previews */}
        {!isMedia && message.msgtype === 'm.text' && message.body && (
          <UrlPreviewCards body={message.body} />
        )}

        {/* Meta line */}
        {(message.edited || (isSelf && message.status)) && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            {message.edited && <span>({t('message.edited')})</span>}
            {isSelf && message.status === 'sending' && <Clock className="h-3 w-3" />}
            {isSelf && message.status === 'sent' && !hasReceipts && <Check className="h-3 w-3" />}
            {isSelf && message.status === 'sent' && hasReceipts && <CheckCheck className="h-3 w-3 text-blue-500" />}
            {isSelf && message.status === 'failed' && <AlertCircle className="h-3 w-3 text-destructive" />}
          </div>
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

      {actionBar}
    </div>
  )
}
