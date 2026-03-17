import type { RoomSummary } from '@matrix-web/matrix-client'
import { getMatrixClient } from '@matrix-web/matrix-client'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { EncryptionBadge } from './crypto/encryption-badge'
import { Avatar } from './ui/avatar'
import { PresenceDot } from './ui/presence-dot'

interface RoomListItemProps {
  room: RoomSummary
  isActive: boolean
  onSelect: (roomId: string) => void
}

function formatTimestamp(ts: number, yesterdayLabel: string): string {
  const date = new Date(ts)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return yesterdayLabel
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function truncateMessage(body: string, maxLength: number = 50): string {
  if (body.length <= maxLength)
    return body
  return `${body.slice(0, maxLength)}…`
}

function getDmUserId(roomId: string): string | null {
  const client = getMatrixClient()
  if (!client)
    return null

  const matrixRoom = client.getRoom(roomId)
  if (!matrixRoom)
    return null

  const myUserId = client.getUserId()
  const members = matrixRoom.getJoinedMembers()
  if (members.length === 2) {
    const other = members.find(m => m.userId !== myUserId)
    return other?.userId ?? null
  }
  return null
}

export function RoomListItem({ room, isActive, onSelect }: RoomListItemProps) {
  const { t } = useTranslation()
  const hasUnread = room.unreadCount > 0
  const hasHighlight = room.highlightCount > 0
  const dmUserId = room.isDirect ? getDmUserId(room.roomId) : null

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
      <div className="relative">
        <Avatar
          name={room.name}
          src={room.avatarUrl ?? undefined}
          size="md"
        />
        {dmUserId && <PresenceDot userId={dmUserId} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'flex items-center gap-1 truncate text-sm',
            hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
          )}
          >
            <EncryptionBadge status={room.isEncrypted ? 'encrypted' : 'unencrypted'} />
            {room.name}
          </span>
          {room.lastMessage && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatTimestamp(room.lastMessage.timestamp, t('room_list_item.yesterday'))}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {room.lastMessage
              ? truncateMessage(room.lastMessage.body)
              : (room.isDirect ? t('room_list_item.direct_message') : t('room_list_item.no_messages'))}
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
