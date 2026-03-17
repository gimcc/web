import type { RoomSummary } from '@matrix-web/matrix-client'
import { cn } from '../lib/utils'
import { Avatar } from './ui/avatar'

interface RoomListItemProps {
  room: RoomSummary
  isActive: boolean
  onSelect: (roomId: string) => void
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function truncateMessage(body: string, maxLength: number = 50): string {
  if (body.length <= maxLength)
    return body
  return `${body.slice(0, maxLength)}…`
}

export function RoomListItem({ room, isActive, onSelect }: RoomListItemProps) {
  const hasUnread = room.unreadCount > 0
  const hasHighlight = room.highlightCount > 0

  return (
    <button
      type="button"
      onClick={() => onSelect(room.roomId)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        'hover:bg-accent/50',
        isActive && 'bg-accent',
      )}
    >
      <Avatar
        name={room.name}
        src={room.avatarUrl ?? undefined}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'truncate text-sm',
            hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
          )}
          >
            {room.name}
          </span>
          {room.lastMessage && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatTimestamp(room.lastMessage.timestamp)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {room.lastMessage
              ? truncateMessage(room.lastMessage.body)
              : (room.isDirect ? 'Direct message' : 'No messages yet')}
          </p>
          {hasUnread && (
            <span className={cn(
              'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-medium text-white',
              hasHighlight ? 'bg-destructive' : 'bg-primary',
            )}
            >
              {room.unreadCount > 99 ? '99+' : room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
