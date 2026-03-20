import type { KnownUser } from '@matrix-web/matrix-client'
import {
  createDmRoom,
  createGroupRoom,
  createMockDmRoom,
  createMockGroupRoom,
  getKnownUsers,
  getMatrixClient,
  getMockKnownUsers,
  parseUserId,
  resolveUserId,
  searchMockUsers,
  searchUsers,
  useAuthStore,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { Check, Search, UserPlus, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent } from '../ui/dialog'
import { Input } from '../ui/input'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'

type Mode = 'dm' | 'group'

interface NewChatDialogProps {
  open: boolean
  onClose: () => void
}

interface UserEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export function NewChatDialog({ open, onClose }: NewChatDialogProps) {
  const { t } = useTranslation()
  const mockMode = useAuthStore(s => s.mockMode)
  const session = useAuthStore(s => s.session)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const upsertRoom = useRoomsStore(s => s.upsertRoom)

  const serverName = session?.userId ? parseUserId(session.userId).serverName : ''

  const [mode, setMode] = useState<Mode>('dm')
  const [searchQuery, setSearchQuery] = useState('')
  const [knownUsers, setKnownUsers] = useState<KnownUser[]>([])
  const [searchResults, setSearchResults] = useState<UserEntry[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserEntry[]>([])
  const [groupName, setGroupName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load known users on open
  useEffect(() => {
    if (!open)
      return

    if (mockMode) {
      setKnownUsers(getMockKnownUsers())
    }
    else {
      const client = getMatrixClient()
      if (client) {
        setKnownUsers(getKnownUsers(client))
      }
    }
  }, [open, mockMode])

  // Search users with debounce + cancellation guard
  useEffect(() => {
    if (!open || !searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const normalizeResults = (results: { userId: string, displayName: string | null, avatarUrl: string | null }[]): UserEntry[] =>
      results.map(r => ({ userId: r.userId, displayName: r.displayName ?? r.userId, avatarUrl: r.avatarUrl }))

    if (mockMode) {
      setSearchResults(normalizeResults(searchMockUsers(searchQuery)))
      return
    }

    const client = getMatrixClient()
    if (!client)
      return

    setSearchResults([])
    let cancelled = false
    const timer = setTimeout(() => {
      searchUsers(client, searchQuery, 20)
        .then((r) => {
          if (!cancelled)
            setSearchResults(normalizeResults(r))
        })
        .catch(() => {
          if (!cancelled)
            setSearchResults([])
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, searchQuery, mockMode])

  // Display list: search results when searching, known users otherwise
  const displayUsers = useMemo(() => {
    if (searchQuery.trim())
      return searchResults

    return knownUsers.map(u => ({
      userId: u.userId,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
    }))
  }, [searchQuery, searchResults, knownUsers])

  const isSelected = useCallback((userId: string) =>
    selectedUsers.some(u => u.userId === userId), [selectedUsers])

  const toggleUser = useCallback((user: UserEntry) => {
    setSelectedUsers(prev =>
      prev.some(u => u.userId === user.userId)
        ? prev.filter(u => u.userId !== user.userId)
        : [...prev, user],
    )
  }, [])

  const handleCreateDm = useCallback(async (user: UserEntry) => {
    setIsCreating(true)
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
      setError(t('new_chat.error_create_dm'))
    }
    finally {
      setIsCreating(false)
    }
  }, [mockMode, setActiveRoom, upsertRoom, onClose, t])

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim() || selectedUsers.length === 0)
      return

    setIsCreating(true)
    setError(null)

    try {
      let roomId: string

      if (mockMode) {
        roomId = createMockGroupRoom()
        upsertRoom({
          roomId,
          name: groupName.trim(),
          topic: null,
          avatarUrl: null,
          isDirect: false,
          isEncrypted: false,
          membership: 'join',
          memberCount: selectedUsers.length + 1,
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
        roomId = await createGroupRoom(client, {
          name: groupName.trim(),
          userIds: selectedUsers.map(u => u.userId),
        })
      }

      setActiveRoom(roomId)
      onClose()
    }
    catch {
      setError(t('new_chat.error_create_group'))
    }
    finally {
      setIsCreating(false)
    }
  }, [mockMode, groupName, selectedUsers, setActiveRoom, upsertRoom, onClose, t])

  // Reset state on open
  useEffect(() => {
    if (!open)
      return
    setSearchQuery('')
    setSelectedUsers([])
    setGroupName('')
    setError(null)
    setMode('dm')
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="flex h-[min(85vh,600px)] flex-col overflow-hidden p-0 sm:max-w-[480px]" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t('new_chat.title')}</h2>
          <DialogClose className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Mode tabs */}
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode)
            if (v === 'dm')
              setSelectedUsers([])
          }}
        >
          <TabsList variant="line" className="h-auto w-full rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="dm" className="flex-1 gap-2 rounded-none py-2.5">
              <UserPlus className="h-4 w-4" />
              {t('new_chat.mode_dm')}
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1 gap-2 rounded-none py-2.5">
              <Users className="h-4 w-4" />
              {t('new_chat.mode_group')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Group name input (group mode only) */}
        {mode === 'group' && (
          <div className="border-b border-border px-4 py-3">
            <Input
              placeholder={t('new_chat.group_name_placeholder')}
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            {selectedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedUsers.map(user => (
                  <Badge key={user.userId} variant="secondary" className="gap-1">
                    {user.displayName}
                    <button
                      type="button"
                      onClick={() => toggleUser(user)}
                      className="rounded-full p-0.5 hover:bg-accent-foreground/10"
                      aria-label={t('new_chat.remove_user', { name: user.displayName })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={mode === 'dm' ? t('new_chat.search_dm_placeholder') : t('new_chat.search_group_placeholder')}
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
          {/* Direct invite entry when query is non-empty */}
          {searchQuery.trim() && (
            <div className="border-b border-border py-1">
              {(() => {
                const resolvedId = resolveUserId(searchQuery, serverName)
                const resolvedEntry: UserEntry = { userId: resolvedId, displayName: resolvedId, avatarUrl: null }
                return (
                  <button
                    type="button"
                    onClick={() => mode === 'dm' ? handleCreateDm(resolvedEntry) : toggleUser(resolvedEntry)}
                    disabled={isCreating}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50',
                      mode === 'group' && isSelected(resolvedId) && 'bg-accent/30',
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <UserPlus className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{resolvedId}</p>
                      <p className="text-xs text-muted-foreground">{t('new_chat.invite_directly')}</p>
                    </div>
                    {mode === 'group' && isSelected(resolvedId) && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                )
              })()}
            </div>
          )}

          {displayUsers.length === 0 && !searchQuery.trim()
            ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('new_chat.empty_default')}
                </p>
              )
            : (
                <div className="py-1">
                  {displayUsers.map(user => (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => mode === 'dm' ? handleCreateDm(user) : toggleUser(user)}
                      disabled={isCreating}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50',
                        mode === 'group' && isSelected(user.userId) && 'bg-accent/30',
                      )}
                    >
                      <Avatar name={user.displayName ?? user.userId} src={user.avatarUrl ?? undefined} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {user.displayName ?? user.userId}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.userId}</p>
                      </div>
                      {mode === 'group' && isSelected(user.userId) && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
        </div>

        {/* Footer (group mode) */}
        {mode === 'group' && (
          <div className="border-t border-border px-4 py-3">
            <Button
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}
              className="w-full"
            >
              {isCreating
                ? t('new_chat.creating')
                : t('new_chat.create_group', { count: selectedUsers.length })}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
