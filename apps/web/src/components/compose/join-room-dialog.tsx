import {
  getMatrixClient,
  joinRoom,
  searchPublicRooms,
  useAuthStore,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { Hash, Search, Users, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'

interface JoinRoomDialogProps {
  open: boolean
  onClose: () => void
}

interface PublicRoom {
  roomId: string
  name: string
  topic: string | null
  memberCount: number
}

type Tab = 'address' | 'directory'

export function JoinRoomDialog({ open, onClose }: JoinRoomDialogProps) {
  const { t } = useTranslation()
  const mockMode = useAuthStore(s => s.mockMode)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)

  const [tab, setTab] = useState<Tab>('address')
  const [address, setAddress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [isJoining, setIsJoining] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open)
      return
    setAddress('')
    setSearchQuery('')
    setPublicRooms([])
    setError(null)
    setTab('address')
  }, [open])

  // Search public rooms with debounce
  useEffect(() => {
    if (tab !== 'directory' || !searchQuery.trim() || mockMode)
      return

    const client = getMatrixClient()
    if (!client)
      return

    let cancelled = false
    setIsSearching(true)
    const timer = setTimeout(() => {
      searchPublicRooms(client, searchQuery)
        .then((rooms) => {
          if (!cancelled)
            setPublicRooms(rooms)
        })
        .catch(() => {
          if (!cancelled)
            setPublicRooms([])
        })
        .finally(() => {
          if (!cancelled)
            setIsSearching(false)
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tab, searchQuery, mockMode])

  const handleJoin = useCallback(async (roomIdOrAlias: string) => {
    if (!roomIdOrAlias.trim())
      return

    setIsJoining(true)
    setError(null)

    try {
      const client = getMatrixClient()
      if (!client)
        return

      const roomId = await joinRoom(client, roomIdOrAlias.trim())
      setActiveRoom(roomId)
      onClose()
    }
    catch {
      setError(t('room.error_join'))
    }
    finally {
      setIsJoining(false)
    }
  }, [setActiveRoom, onClose, t])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="flex h-[min(85vh,550px)] flex-col overflow-hidden p-0 sm:max-w-[480px]" showCloseButton={false}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t('room.join_title')}</h2>
          <DialogClose className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
          <TabsList variant="line" className="h-auto w-full rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="address" className="flex-1 gap-2 rounded-none py-2.5">
              <Hash className="h-4 w-4" />
              {t('room.by_address')}
            </TabsTrigger>
            <TabsTrigger value="directory" className="flex-1 gap-2 rounded-none py-2.5">
              <Search className="h-4 w-4" />
              {t('room.directory')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {error && (
          <div className="mx-4 mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        {tab === 'address' && (
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div>
              <Label className="mb-1">{t('room.address_label')}</Label>
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="#room:server.com"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleJoin(address)}
              />
            </div>
            <Button onClick={() => handleJoin(address)} disabled={isJoining || !address.trim()}>
              {isJoining ? t('room.joining') : t('room.join_button')}
            </Button>
          </div>
        )}

        {tab === 'directory' && (
          <>
            <div className="border-b border-border px-4 py-3">
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
            <div className="flex-1 overflow-y-auto">
              {isSearching && <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('room.searching')}</p>}
              {!isSearching && publicRooms.length === 0 && searchQuery && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('room.no_rooms_found')}</p>
              )}
              {publicRooms.map(room => (
                <button
                  key={room.roomId}
                  type="button"
                  onClick={() => handleJoin(room.roomId)}
                  disabled={isJoining}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
                    {room.topic && <p className="truncate text-xs text-muted-foreground">{room.topic}</p>}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {room.memberCount}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
