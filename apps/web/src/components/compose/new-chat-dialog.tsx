import type { KnownUser } from '@matrix-web/matrix-client'
import {
  createDmRoom,
  createGroupRoom,
  createMockDmRoom,
  createMockGroupRoom,
  getKnownUsers,
  getMatrixClient,
  getMockKnownUsers,
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
import { Button } from '../ui/button'
import { Input } from '../ui/input'

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
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const upsertRoom = useRoomsStore(s => s.upsertRoom)

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape')
      onClose()
  }, [onClose])

  useEffect(() => {
    if (!open)
      return

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Reset state
    setSearchQuery('')
    setSelectedUsers([])
    setGroupName('')
    setError(null)
    setMode('dm')

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open)
    return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={t('common.close')}
      />

      <div role="dialog" aria-modal="true" aria-label={t('new_chat.title')} className="relative z-10 flex h-[min(85vh,600px)] w-[min(95vw,480px)] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t('new_chat.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div role="tablist" className="flex border-b border-border">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'dm'}
            onClick={() => {
              setMode('dm')
              setSelectedUsers([])
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors',
              mode === 'dm'
                ? 'border-b-2 border-primary font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <UserPlus className="h-4 w-4" />
            {t('new_chat.mode_dm')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'group'}
            onClick={() => setMode('group')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors',
              mode === 'group'
                ? 'border-b-2 border-primary font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Users className="h-4 w-4" />
            {t('new_chat.mode_group')}
          </button>
        </div>

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
                  <span
                    key={user.userId}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-foreground"
                  >
                    {user.displayName}
                    <button
                      type="button"
                      onClick={() => toggleUser(user)}
                      className="rounded-full p-0.5 hover:bg-accent-foreground/10"
                      aria-label={t('new_chat.remove_user', { name: user.displayName })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
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
          {displayUsers.length === 0
            ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? t('new_chat.empty_search') : t('new_chat.empty_default')}
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
      </div>
    </div>
  )
}
