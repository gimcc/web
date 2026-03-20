import type { ReceiptInfo, TimelineMessageItem } from '@matrix-web/matrix-client'
import { useAuthStore } from '@matrix-web/matrix-client'
import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { MediaMessage } from './media-message'
import { MessageActions } from './message-actions'
import { MessageContent } from './message-content'
import { ReactionBar } from './reaction-bar'

interface MessageCompactProps {
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

export function MessageCompact({
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
}: MessageCompactProps) {
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
      <div className="flex items-baseline gap-2 px-3 py-0.5 text-xs">
        <span className="w-12 shrink-0 text-right text-muted-foreground/60">{timeStr}</span>
        <span className="italic text-muted-foreground">{t('message.deleted')}</span>
      </div>
    )
  }

  const actionBar = message.status === 'sent' && onReaction
    ? (
        <div className="absolute right-1 top-0 hidden group-hover:block z-10">
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
        'group relative flex items-start gap-2 px-3 py-0.5 transition-colors hover:bg-accent/30',
        highlighted && 'bg-primary/10',
      )}
    >
      {/* Timestamp */}
      <span className="mt-0.5 w-12 shrink-0 text-right text-[11px] text-muted-foreground/60">
        {!collapsed && timeStr}
      </span>

      {/* Sender name */}
      <span className={cn(
        'mt-0.5 w-28 shrink-0 truncate text-xs font-semibold',
        isSelf ? 'text-primary' : 'text-foreground',
      )}
      >
        {!collapsed && (message.senderName || message.senderId)}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {message.replyTo && (
          <button
            type="button"
            onClick={() => onJumpToEvent?.(message.replyTo!.eventId)}
            className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">
              &gt; {message.replyTo.senderName}: {message.replyTo.body || '...'}
            </span>
          </button>
        )}

        <div className="flex items-baseline gap-1.5">
          <div className="min-w-0 flex-1 text-sm">
            {isMedia
              ? <MediaMessage message={message} />
              : <MessageContent message={message} />}
          </div>

          {/* Status indicators */}
          <span className="inline-flex shrink-0 items-center gap-0.5">
            {message.edited && (
              <span className="text-[10px] text-muted-foreground">({t('message.edited')})</span>
            )}
            {isSelf && message.status === 'sending' && <Clock className="h-3 w-3 text-muted-foreground/70" />}
            {isSelf && message.status === 'sent' && !hasReceipts && <Check className="h-3 w-3 text-muted-foreground/70" />}
            {isSelf && message.status === 'sent' && hasReceipts && <CheckCheck className="h-3 w-3 text-blue-500" />}
            {isSelf && message.status === 'failed' && <AlertCircle className="h-3 w-3 text-destructive" />}
          </span>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <ReactionBar reactions={message.reactions} onToggle={handleReaction} />
        )}

        {message.status === 'failed' && onResend && (
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
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
