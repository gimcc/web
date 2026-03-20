import {
  followTombstone,
  getMatrixClient,
  getRoomTombstone,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

interface TombstoneBannerProps {
  roomId: string
}

export function TombstoneBanner({ roomId }: TombstoneBannerProps) {
  const { t } = useTranslation()
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const [tombstone, setTombstone] = useState<{ body: string, replacementRoomId: string } | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = getMatrixClient()
    if (!client)
      return
    setTombstone(getRoomTombstone(client, roomId))
  }, [roomId])

  const handleFollow = useCallback(async () => {
    if (!tombstone)
      return
    const client = getMatrixClient()
    if (!client)
      return

    setIsFollowing(true)
    setError(null)

    try {
      const newRoomId = await followTombstone(client, tombstone.replacementRoomId)
      setActiveRoom(newRoomId)
    }
    catch {
      setError(t('tombstone.error_follow'))
    }
    finally {
      setIsFollowing(false)
    }
  }, [tombstone, setActiveRoom, t])

  if (!tombstone)
    return null

  return (
    <div className="flex items-center gap-3 border-b border-orange-300 bg-orange-50 px-4 py-2 dark:border-orange-700 dark:bg-orange-950/30">
      <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
          {t('tombstone.title')}
        </p>
        <p className="truncate text-xs text-orange-600 dark:text-orange-400">
          {tombstone.body}
        </p>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleFollow}
        disabled={isFollowing}
        className="shrink-0 gap-1"
      >
        {t('tombstone.follow')}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  )
}
