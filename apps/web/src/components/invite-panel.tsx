import type { RoomSummary } from '@matrix-web/matrix-client'
import { getMatrixClient, useRoomsStore } from '@matrix-web/matrix-client'
import { Bell, Check, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { Avatar } from './ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

function useInviteRooms(): RoomSummary[] {
  const rooms = useRoomsStore(s => s.rooms)
  return useMemo(
    () => [...rooms.values()].filter(r => r.membership === 'invite'),
    [rooms],
  )
}

function InviteItem({ room }: { room: RoomSummary }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return
    setLoading('accept')
    setError(null)
    try {
      await client.joinRoom(room.roomId)
    }
    catch (err) {
      setLoading(null)
      setError(err instanceof Error ? err.message : t('invite.error_accept'))
    }
  }, [room.roomId, t])

  const handleReject = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return
    setLoading('reject')
    setError(null)
    try {
      await client.leave(room.roomId)
    }
    catch (err) {
      setLoading(null)
      setError(err instanceof Error ? err.message : t('invite.error_reject'))
    }
  }, [room.roomId, t])

  return (
    <div className="px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <Avatar name={room.name} src={room.avatarUrl ?? undefined} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
          <p className="text-xs text-muted-foreground">
            {room.isDirect ? t('invite.dm_invite') : t('invite.room_invite')}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={loading !== null}
            onClick={handleAccept}
            className={cn(
              'rounded-full p-1.5 transition-colors',
              'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30',
              loading === 'accept' && 'animate-pulse',
              loading !== null && 'opacity-50',
            )}
            aria-label={t('invite.accept_label')}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={handleReject}
            className={cn(
              'rounded-full p-1.5 transition-colors',
              'text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30',
              loading === 'reject' && 'animate-pulse',
              loading !== null && 'opacity-50',
            )}
            aria-label={t('invite.reject_label')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

export function InviteBell() {
  const { t } = useTranslation()
  const invites = useInviteRooms()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t('invite.invitations')}
        >
          <Bell className="h-5 w-5" />
          {invites.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-medium text-white">
              {invites.length > 99 ? '99+' : invites.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 overflow-hidden p-0" side="bottom" align="end">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
          <p className="text-sm font-semibold text-foreground">
            {t('invite.invitations')}
          </p>
          {invites.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
              {invites.length}
            </span>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {invites.length === 0
            ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8">
                  <Bell className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {t('invite.no_pending')}
                  </p>
                </div>
              )
            : (
                <div className="divide-y divide-border">
                  {invites.map(room => (
                    <InviteItem key={room.roomId} room={room} />
                  ))}
                </div>
              )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
