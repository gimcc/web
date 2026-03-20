import type { TimelineMemberItem, TimelineStateItem } from '@matrix-web/matrix-client'
import { LogIn, LogOut, Shield, UserMinus, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function MemberEventIcon({ membership, prevMembership }: { membership: string, prevMembership?: string }) {
  if (membership === 'join' && prevMembership !== 'join')
    return <LogIn className="h-3 w-3" />
  if (membership === 'leave' && prevMembership === 'join')
    return <LogOut className="h-3 w-3" />
  if (membership === 'invite')
    return <UserPlus className="h-3 w-3" />
  if (membership === 'ban')
    return <UserMinus className="h-3 w-3" />
  return <LogIn className="h-3 w-3" />
}

function describeMember(item: TimelineMemberItem, t: (key: string, opts?: any) => string): string {
  const { membership, prevMembership, senderName, targetName, senderId, targetId } = item
  const isSelf = senderId === targetId

  // Profile change: same membership (join → join) but display name or avatar changed
  if (membership === 'join' && prevMembership === 'join') {
    return t('member.profile_change', { name: targetName, defaultValue: `${targetName} updated their profile` })
  }
  if (membership === 'join') {
    return isSelf
      ? t('member.joined', { name: targetName, defaultValue: `${targetName} joined the room` })
      : t('member.invited_joined', { name: targetName, defaultValue: `${targetName} joined the room` })
  }
  if (membership === 'leave' && prevMembership === 'join') {
    return isSelf
      ? t('member.left', { name: targetName, defaultValue: `${targetName} left the room` })
      : t('member.kicked', { name: targetName, by: senderName, defaultValue: `${senderName} kicked ${targetName}` })
  }
  if (membership === 'leave' && prevMembership === 'invite') {
    return isSelf
      ? t('member.rejected_invite', { name: targetName, defaultValue: `${targetName} rejected the invite` })
      : t('member.uninvited', { name: targetName, by: senderName, defaultValue: `${senderName} withdrew ${targetName}'s invite` })
  }
  if (membership === 'invite') {
    return t('member.invited', { name: targetName, by: senderName, defaultValue: `${senderName} invited ${targetName}` })
  }
  if (membership === 'ban') {
    return t('member.banned', { name: targetName, by: senderName, defaultValue: `${senderName} banned ${targetName}` })
  }
  return `${targetName}: ${membership}`
}

export function MemberEventRow({ item }: { item: TimelineMemberItem }) {
  const { t } = useTranslation()
  const description = describeMember(item, t)
  const time = new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-muted-foreground">
      <MemberEventIcon membership={item.membership} prevMembership={item.prevMembership} />
      <span className="text-xs">{description}</span>
      <span className="text-xs opacity-50">{time}</span>
    </div>
  )
}

export function StateEventRow({ item }: { item: TimelineStateItem }) {
  const time = new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-muted-foreground">
      <Shield className="h-3 w-3" />
      <span className="text-xs">{item.description}</span>
      <span className="text-xs opacity-50">{time}</span>
    </div>
  )
}
