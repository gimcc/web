import type { PublicRoomInfo } from '@matrix-web/matrix-client'
import {
  browsePublicRooms,
  getMatrixClient,
  joinRoom,
  useAuthStore,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { Compass, Globe, Search, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface RoomDirectoryDialogProps {
  open: boolean
  onClose: () => void
}

export function RoomDirectoryDialog({ open, onClose }: RoomDirectoryDialogProps) {
  const { t } = useTranslation()
  const mockMode = useAuthStore(s => s.mockMode)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const joinedRooms = useRoomsStore(s => s.rooms)

  const [server, setServer] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [rooms, setRooms] = useState<PublicRoomInfo[]>([])
  const [nextBatch, setNextBatch] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isJoining, setIsJoining] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const loadRooms = useCallback(async (opts: {
    query?: string
    serverOverride?: string
    since?: string
  } = {}) => {
    const client = getMatrixClient()
    if (!client)
      return

    const isMore = !!opts.since
    if (isMore) {
      setIsLoadingMore(true)
    }
    else {
      setIsLoading(true)
    }

    try {
      const result = await browsePublicRooms(client, {
        server: opts.serverOverride || server || undefined,
        query: opts.query || undefined,
        limit: 20,
        since: opts.since,
      })

      if (isMore) {
        setRooms(prev => [...prev, ...result.rooms])
      }
      else {
        setRooms(result.rooms)
      }
      setNextBatch(result.nextBatch)
      setTotalCount(result.totalRoomCount)
      setError(null)
    }
    catch {
      if (!isMore) {
        setRooms([])
      }
      setError(t('room.error_join'))
    }
    finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [server, t])

  // Load featured rooms on open
  useEffect(() => {
    if (!open || mockMode)
      return
    setSearchQuery('')
    setServer('')
    setError(null)
    setRooms([])
    setNextBatch(null)
    loadRooms()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mockMode])

  // Debounced search
  useEffect(() => {
    if (!open || mockMode)
      return

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    searchTimerRef.current = setTimeout(() => {
      loadRooms({ query: searchQuery })
    }, 400)

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, open, mockMode])

  const handleServerChange = useCallback((newServer: string) => {
    setServer(newServer)
    // Reload with new server after a brief delay
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchTimerRef.current = setTimeout(() => {
      loadRooms({ query: searchQuery, serverOverride: newServer })
    }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const handleJoin = useCallback(async (roomIdOrAlias: string) => {
    const client = getMatrixClient()
    if (!client)
      return

    setIsJoining(roomIdOrAlias)

    try {
      const roomId = await joinRoom(client, roomIdOrAlias)
      setActiveRoom(roomId)
      onClose()
    }
    catch {
      setError(t('room.error_join'))
    }
    finally {
      setIsJoining(null)
    }
  }, [setActiveRoom, onClose, t])

  const handleLoadMore = useCallback(() => {
    if (nextBatch) {
      loadRooms({ query: searchQuery, since: nextBatch })
    }
  }, [nextBatch, searchQuery, loadRooms])

  const isRoomJoined = useCallback((roomId: string) => {
    return joinedRooms.has(roomId)
  }, [joinedRooms])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="flex h-[min(85vh,600px)] flex-col overflow-hidden p-0 sm:max-w-[520px]" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{t('room.explore_title')}</h2>
          </div>
          <DialogClose className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Server selector + search */}
        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Label className="shrink-0 text-sm">{t('room.server_label')}</Label>
            <Input
              value={server}
              onChange={e => handleServerChange(e.target.value)}
              placeholder={t('room.server_placeholder')}
              className="h-8 text-sm"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('room.search_rooms_placeholder')}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('room.searching')}</p>
          )}

          {!isLoading && rooms.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('room.no_rooms_found')}</p>
          )}

          {!isLoading && rooms.length > 0 && (
            <>
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {searchQuery ? t('room.directory') : t('room.featured_rooms')}
                </p>
                {totalCount != null && (
                  <p className="text-xs text-muted-foreground">
                    {t('room.total_rooms', { count: totalCount })}
                  </p>
                )}
              </div>

              {rooms.map(room => (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => !isRoomJoined(room.roomId) && handleJoin(room.canonicalAlias ?? room.roomId)}
                  disabled={isJoining === room.roomId || isRoomJoined(room.roomId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-60"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {room.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
                    {room.canonicalAlias && (
                      <p className="truncate text-xs text-muted-foreground">{room.canonicalAlias}</p>
                    )}
                    {room.topic && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{room.topic}</p>
                    )}
                  </div>

                  {/* Member count or joined badge */}
                  {isRoomJoined(room.roomId)
                    ? (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {t('room.already_joined')}
                        </span>
                      )
                    : (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {room.memberCount}
                        </span>
                      )}
                </button>
              ))}

              {/* Load more */}
              {nextBatch && (
                <div className="px-4 py-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? t('room.searching') : t('room.load_more')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
