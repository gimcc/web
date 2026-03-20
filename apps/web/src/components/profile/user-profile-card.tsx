import type { UserProfile } from '@matrix-web/matrix-client'
import {
  createDmRoom,
  getMatrixClient,
  getSharedRooms,
  getUserProfile,
  mxcToThumbnailUrl,
  useAuthStore,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { Loader2, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

interface SharedRoom {
  roomId: string
  name: string
  avatarUrl: string | null
}

interface UserProfileCardProps {
  userId: string
  open: boolean
  onClose: () => void
}

export function UserProfileCard({ userId, open, onClose }: UserProfileCardProps) {
  const { t } = useTranslation()
  const session = useAuthStore(s => s.session)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sharedRooms, setSharedRooms] = useState<SharedRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [dmLoading, setDmLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMe = session?.userId === userId

  useEffect(() => {
    if (!open)
      return

    const client = getMatrixClient()
    if (!client)
      return

    setLoading(true)
    setError(null)

    getUserProfile(client, userId)
      .then((p) => {
        setProfile(p)
        if (!isMe) {
          setSharedRooms(getSharedRooms(client, userId))
        }
      })
      .catch(() => {
        setError(t('profile_card.error_load'))
      })
      .finally(() => setLoading(false))
  }, [open, userId, isMe, t])

  const handleSendMessage = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return

    setDmLoading(true)
    try {
      const roomId = await createDmRoom(client, { userId })
      setActiveRoom(roomId)
      onClose()
    }
    catch {
      setError(t('profile_card.error_dm'))
    }
    finally {
      setDmLoading(false)
    }
  }, [userId, setActiveRoom, onClose, t])

  const handleRoomClick = useCallback((roomId: string) => {
    setActiveRoom(roomId)
    onClose()
  }, [setActiveRoom, onClose])

  const avatarHttpUrl = profile?.avatarMxc && session?.homeserverUrl
    ? mxcToThumbnailUrl(profile.avatarMxc, session.homeserverUrl, 96, 96, 'crop')
    : profile?.avatarUrl ?? undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('profile_card.title')}</DialogTitle>
        </DialogHeader>

        {loading
          ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )
          : error
            ? (
                <p className="py-4 text-center text-sm text-destructive">{error}</p>
              )
            : profile && (
              <div className="space-y-4">
                {/* Avatar + name */}
                <div className="flex flex-col items-center gap-3">
                  <Avatar
                    name={profile.displayName ?? userId}
                    src={avatarHttpUrl ?? undefined}
                    size="lg"
                    className="h-20 w-20 text-xl"
                  />
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground">
                      {profile.displayName ?? userId}
                    </p>
                    <p className="text-xs text-muted-foreground">{userId}</p>
                  </div>
                </div>

                {/* Actions */}
                {!isMe && (
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={dmLoading}
                    >
                      {dmLoading
                        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        : <MessageSquare className="mr-1.5 h-3.5 w-3.5" />}
                      {t('profile_card.send_message')}
                    </Button>
                  </div>
                )}

                {/* Shared rooms */}
                {!isMe && sharedRooms.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t('profile_card.shared_rooms', { count: sharedRooms.length })}
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {sharedRooms.map(room => (
                        <button
                          key={room.roomId}
                          type="button"
                          onClick={() => handleRoomClick(room.roomId)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/50"
                        >
                          <Avatar name={room.name} src={room.avatarUrl ?? undefined} size="sm" />
                          <span className="truncate text-sm text-foreground">{room.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
      </DialogContent>
    </Dialog>
  )
}
