import type { TimelineMessage } from '@matrix-web/matrix-client'
import { useAuthStore } from '@matrix-web/matrix-client'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../lib/utils'
import { MediaMessage } from './media-message'
import { MessageContent } from './message-content'

interface MessageBubbleProps {
  message: TimelineMessage
  onResend?: (eventId: string) => void
}

function MessageStatusIcon({ status }: { status: TimelineMessage['status'] }) {
  switch (status) {
    case 'sending':
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-destructive" />
    default:
      return null
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageBubble({ message, onResend }: MessageBubbleProps) {
  const userId = useAuthStore(s => s.session?.userId)
  const isSelf = message.senderId === userId
  const isEmote = message.msgtype === 'm.emote'
  const isMedia = ['m.image', 'm.video', 'm.file'].includes(message.msgtype)

  const timeStr = useMemo(() => formatTime(message.timestamp), [message.timestamp])

  if (isEmote) {
    return (
      <div className="group flex items-baseline gap-2 px-4 py-0.5 hover:bg-accent/50">
        <span className="text-xs text-muted-foreground">{timeStr}</span>
        <span className="text-sm italic text-muted-foreground">
          *
          {' '}
          {message.senderName}
          {' '}
          {message.body}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-1.5 hover:bg-accent/50',
        message.status === 'failed' && 'bg-destructive/5',
      )}
    >
      {/* Avatar placeholder */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {message.senderName.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        {/* Sender name and time */}
        <div className="flex items-baseline gap-2">
          <span className={cn(
            'text-sm font-semibold',
            isSelf ? 'text-primary' : 'text-foreground',
          )}
          >
            {message.senderName}
          </span>
          <span className="text-xs text-muted-foreground">{timeStr}</span>
          {isSelf && <MessageStatusIcon status={message.status} />}
        </div>

        {/* Message content */}
        {isMedia
          ? <MediaMessage message={message} />
          : <MessageContent message={message} />}

        {/* Failed message actions */}
        {message.status === 'failed' && onResend && (
          <button
            type="button"
            className="mt-1 text-xs text-destructive hover:underline"
            onClick={() => onResend(message.eventId)}
          >
            Failed to send. Click to retry.
          </button>
        )}
      </div>
    </div>
  )
}
