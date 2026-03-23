import type { RoomMemberInfo } from '@matrix-web/matrix-client'
import {
  banUser,
  getMatrixClient,
  getMyPowerLevel,
  getRoomMembers,
  inviteUser,
  isUserFullyVerified,
  kickUser,
  parseUserId,
  resolveUserId,
  searchUsers,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { Ban, Crown, Search, Shield, ShieldAlert, ShieldCheck, UserMinus, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { UserProfileCard } from '../profile/user-profile-card'
import { Avatar } from '../ui/avatar'
import { Input } from '../ui/input'

interface MemberListPanelProps {
  roomId: string
  onClose: () => void
}

type SortMode = 'name' | 'role'

function getRoleIcon(powerLevel: number) {
  if (powerLevel >= 100)
    return <Crown className="h-3 w-3 text-amber-500" />
  if (powerLevel >= 50)
    return <Shield className="h-3 w-3 text-blue-500" />
  return null
}

export function MemberListPanel({ roomId, onClose }: MemberListPanelProps) {
  const { t } = useTranslation()
  const session = useAuthStore(s => s.session)
  const serverName = session?.userId ? parseUserId(session.userId).serverName : ''
  const [members, setMembers] = useState<RoomMemberInfo[]>([])
  const [filter, setFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('role')
  const [myPower, setMyPower] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<{ userId: string, displayName: string | null }[]>([])
  const [profileCardUserId, setProfileCardUserId] = useState<string | null>(null)
  const [memberTrust, setMemberTrust] = useState<Map<string, boolean>>(() => new Map())

  useEffect(() => {
    const client = getMatrixClient()
    if (!client)
      return
    const roomMembers = getRoomMembers(client, roomId)
    setMembers(roomMembers)
    setMyPower(getMyPowerLevel(client, roomId))

    // Lazy-load trust status for each member
    let cancelled = false
    const trustMap = new Map<string, boolean>()
    Promise.all(
      roomMembers.map(async (m) => {
        try {
          const verified = await isUserFullyVerified(client, m.userId)
          if (!cancelled) {
            trustMap.set(m.userId, verified)
          }
        }
        catch {
          // Crypto may not be ready for this user
        }
      }),
    ).then(() => {
      if (!cancelled)
        setMemberTrust(new Map(trustMap))
    })
    return () => {
      cancelled = true
    }
  }, [roomId])

  // Search for invite
  useEffect(() => {
    if (!showInvite || !inviteQuery.trim())
      return
    const client = getMatrixClient()
    if (!client)
      return

    let cancelled = false
    const timer = setTimeout(() => {
      searchUsers(client, inviteQuery, 10)
        .then((r) => {
          if (!cancelled)
            setInviteResults(r.map(u => ({ userId: u.userId, displayName: u.displayName })))
        })
        .catch(() => {})
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [showInvite, inviteQuery])

  const filtered = useMemo(() => {
    let list = members
    if (filter.trim()) {
      const q = filter.toLowerCase()
      list = list.filter(m => m.displayName.toLowerCase().includes(q) || m.userId.toLowerCase().includes(q))
    }
    if (sortMode === 'role') {
      // eslint-disable-next-line e18e/prefer-array-to-sorted -- mutating a copy is fine here
      list = [...list].sort((a, b) => b.powerLevel - a.powerLevel || a.displayName.localeCompare(b.displayName))
    }
    else {
      // eslint-disable-next-line e18e/prefer-array-to-sorted -- mutating a copy is fine here
      list = [...list].sort((a, b) => a.displayName.localeCompare(b.displayName))
    }
    return list
  }, [members, filter, sortMode])

  const grouped = useMemo(() => {
    if (sortMode !== 'role')
      return null
    const admins = filtered.filter(m => m.powerLevel >= 100)
    const mods = filtered.filter(m => m.powerLevel >= 50 && m.powerLevel < 100)
    const regular = filtered.filter(m => m.powerLevel < 50)
    return { admins, mods, regular }
  }, [filtered, sortMode])

  const handleKick = useCallback(async (userId: string) => {
    const client = getMatrixClient()
    if (!client)
      return
    setActionError(null)
    try {
      await kickUser(client, roomId, userId)
      setMembers(prev => prev.filter(m => m.userId !== userId))
    }
    catch {
      setActionError(t('member.error_kick'))
    }
  }, [roomId, t])

  const handleBan = useCallback(async (userId: string) => {
    const client = getMatrixClient()
    if (!client)
      return
    setActionError(null)
    try {
      await banUser(client, roomId, userId)
      setMembers(prev => prev.filter(m => m.userId !== userId))
    }
    catch {
      setActionError(t('member.error_ban'))
    }
  }, [roomId, t])

  const handleInvite = useCallback(async (userId: string) => {
    const client = getMatrixClient()
    if (!client)
      return
    setActionError(null)
    try {
      await inviteUser(client, roomId, userId)
      setShowInvite(false)
      setInviteQuery('')
    }
    catch {
      setActionError(t('member.error_invite'))
    }
  }, [roomId, t])

  const renderMember = (member: RoomMemberInfo) => {
    const trustVerified = memberTrust.get(member.userId)
    return (
      <div key={member.userId} className="group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent/50">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setProfileCardUserId(member.userId)}
        >
          <div className="relative shrink-0">
            <Avatar name={member.displayName} src={member.avatarUrl ?? undefined} size="sm" />
            {trustVerified !== undefined && (
              trustVerified
                ? <ShieldCheck className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background text-green-500" aria-label={t('trust.verified')} />
                : <ShieldAlert className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background text-yellow-500" aria-label={t('trust.unverified')} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-medium text-foreground">{member.displayName}</span>
              {getRoleIcon(member.powerLevel)}
            </div>
            <p className="truncate text-xs text-muted-foreground">{member.userId}</p>
          </div>
        </button>
        {myPower >= 50 && member.powerLevel < myPower && (
          <div className="hidden items-center gap-0.5 group-hover:flex">
            <button type="button" onClick={() => handleKick(member.userId)} className="rounded p-1 text-muted-foreground hover:text-destructive" title={t('member.kick')}>
              <UserMinus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => handleBan(member.userId)} className="rounded p-1 text-muted-foreground hover:text-destructive" title={t('member.ban')}>
              <Ban className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderProfileCard = () => {
    if (!profileCardUserId)
      return null
    return (
      <UserProfileCard
        userId={profileCardUserId}
        open={!!profileCardUserId}
        onClose={() => setProfileCardUserId(null)}
      />
    )
  }

  const renderGroup = (label: string, members: RoomMemberInfo[]) => {
    if (members.length === 0)
      return null
    return (
      <div key={label}>
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {`${label} — ${members.length}`}
        </p>
        {members.map(renderMember)}
      </div>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">{`${t('member.title')} (${members.length})`}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter + sort */}
      <div className="space-y-2 border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder={t('member.filter_placeholder')} className="h-8 pl-7 text-xs" />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setSortMode('role')} className={cn('rounded px-2 py-0.5 text-xs', sortMode === 'role' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>{t('member.sort_role')}</button>
          <button type="button" onClick={() => setSortMode('name')} className={cn('rounded px-2 py-0.5 text-xs', sortMode === 'name' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>{t('member.sort_name')}</button>
          {myPower >= 50 && (
            <button type="button" onClick={() => setShowInvite(v => !v)} className="ml-auto rounded p-0.5 text-muted-foreground hover:text-primary">
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {actionError && <p className="px-3 py-1 text-xs text-destructive">{actionError}</p>}

      {/* Invite panel */}
      {showInvite && (
        <div className="border-b border-border px-3 py-2 space-y-1">
          <Input value={inviteQuery} onChange={e => setInviteQuery(e.target.value)} placeholder={t('member.invite_placeholder')} className="h-8 text-xs" autoFocus />
          {inviteQuery.trim() && (
            <button type="button" onClick={() => handleInvite(resolveUserId(inviteQuery, serverName))} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-primary hover:bg-accent/50">
              <UserPlus className="h-3 w-3" />
              <span className="truncate">{resolveUserId(inviteQuery, serverName)}</span>
            </button>
          )}
          {inviteResults.map(u => (
            <button key={u.userId} type="button" onClick={() => handleInvite(u.userId)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-accent/50">
              <span className="truncate text-xs text-foreground">{u.displayName ?? u.userId}</span>
            </button>
          ))}
        </div>
      )}

      {/* Member list */}
      <div className="flex-1 overflow-y-auto">
        {grouped
          ? (
              <div className="space-y-1 py-1">
                {renderGroup(t('member.role_admin'), grouped.admins)}
                {renderGroup(t('member.role_moderator'), grouped.mods)}
                {renderGroup(t('member.role_member'), grouped.regular)}
              </div>
            )
          : (
              <div className="py-1">
                {filtered.map(renderMember)}
              </div>
            )}
      </div>

      {renderProfileCard()}
    </div>
  )
}
