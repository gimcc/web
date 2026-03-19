import type { KnownUser } from '@matrix-web/matrix-client'
import {
  createDmRoom,
  createMockDmRoom,
  getKnownUsers,
  getMatrixClient,
  getMockKnownUsers,
  useAuthStore,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { MessageSquare, Search, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui/avatar'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'

interface ContactsDialogProps {
  open: boolean
  onClose: () => void
}

export function ContactsDialog({ open, onClose }: ContactsDialogProps) {
  const { t } = useTranslation()
  const mockMode = useAuthStore(s => s.mockMode)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const upsertRoom = useRoomsStore(s => s.upsertRoom)
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<KnownUser[]>([])
  const [startingDm, setStartingDm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open)
      return

    if (mockMode) {
      setUsers(getMockKnownUsers())
    }
    else {
      const client = getMatrixClient()
      if (client) {
        setUsers(getKnownUsers(client))
      }
    }
  }, [open, mockMode])

  useEffect(() => {
    if (open) {
      setSearchQuery('')
    }
  }, [open])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim())
      return users

    const q = searchQuery.toLowerCase()
    return users.filter(u =>
      u.displayName.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q),
    )
  }, [users, searchQuery])

  const handleStartDm = useCallback(async (user: KnownUser) => {
    setStartingDm(user.userId)
    setError(null)

    try {
      let roomId: string

      if (mockMode) {
        roomId = createMockDmRoom(user.userId)
        upsertRoom({
          roomId,
          name: user.displayName,
          topic: null,
          avatarUrl: user.avatarUrl,
          isDirect: true,
          isEncrypted: true,
          membership: 'join',
          memberCount: 2,
          lastMessage: null,
          unreadCount: 0,
          highlightCount: 0,
          timestamp: Date.now(),
        })
      }
      else {
        const client = getMatrixClient()
        if (!client)
          return
        roomId = await createDmRoom(client, { userId: user.userId, encrypted: true })
      }

      setActiveRoom(roomId)
      onClose()
    }
    catch {
      setError(t('contacts.error_start_dm'))
    }
    finally {
      setStartingDm(null)
    }
  }, [mockMode, setActiveRoom, upsertRoom, onClose, t])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="flex h-[min(80vh,560px)] flex-col overflow-hidden p-0 sm:max-w-[440px]" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <DialogTitle className="text-base">{t('contacts.title')}</DialogTitle>
          </div>
          <DialogClose className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Search */}
        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('contacts.search_placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0
            ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? t('contacts.empty_search') : t('contacts.empty_default')}
                </p>
              )
            : (
                <div className="py-1">
                  {filteredUsers.map(user => (
                    <div
                      key={user.userId}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50"
                    >
                      <Avatar name={user.displayName} src={user.avatarUrl ?? undefined} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.userId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartDm(user)}
                        disabled={startingDm === user.userId}
                        className={cn(
                          'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                          startingDm === user.userId && 'opacity-50',
                        )}
                        aria-label={t('contacts.message_user', { name: user.displayName })}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {t('contacts.count_other', { count: filteredUsers.length })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
