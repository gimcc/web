import type { NotificationItem } from '@matrix-web/matrix-client'
import {
  getMatrixClient,
  getNotifications,
  markRoomNotificationsRead,
  useRoomsStore,
  useTimelineStore,
} from '@matrix-web/matrix-client'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface NotificationInboxProps {
  onClose: () => void
}

export function NotificationInbox({ onClose }: NotificationInboxProps) {
  const { t, i18n: { language } } = useTranslation()
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const timelineVersion = useTimelineStore(s => s.versions)
  const [items, setItems] = useState<NotificationItem[]>([])

  const refreshNotifications = useCallback(() => {
    const client = getMatrixClient()
    if (!client)
      return
    setItems(getNotifications(client))
  }, [])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications, timelineVersion])

  const handleGoToRoom = useCallback((roomId: string) => {
    setActiveRoom(roomId)
    onClose()
  }, [setActiveRoom, onClose])

  const handleMarkAllRead = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return

    const roomIds = new Set(items.map(i => i.roomId))
    await Promise.all(
      Array.from(roomIds, roomId => markRoomNotificationsRead(client, roomId)),
    )
    refreshNotifications()
  }, [items, refreshNotifications])

  const formatTime = useMemo(() => {
    const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
    return (ts: number) => {
      const diff = Date.now() - ts
      if (diff < 60_000)
        return formatter.format(-Math.floor(diff / 1000), 'second')
      if (diff < 3_600_000)
        return formatter.format(-Math.floor(diff / 60_000), 'minute')
      if (diff < 86_400_000)
        return formatter.format(-Math.floor(diff / 3_600_000), 'hour')
      return formatter.format(-Math.floor(diff / 86_400_000), 'day')
    }
  }, [language])

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">{t('notification_inbox.title')}</h3>
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={t('notification_inbox.mark_read')}
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0
          ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-muted-foreground">{t('notification_inbox.empty')}</p>
              </div>
            )
          : (
              <div className="divide-y divide-border">
                {items.map(item => (
                  <button
                    key={item.eventId}
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                    onClick={() => handleGoToRoom(item.roomId)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{item.senderName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatTime(item.timestamp)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{item.roomName}</p>
                    <p className="line-clamp-2 text-xs text-foreground/80">{item.body}</p>
                  </button>
                ))}
              </div>
            )}
      </div>
    </div>
  )
}
