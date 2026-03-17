import { getMatrixClient, useTypingStore } from '@matrix-web/matrix-client'
import { useTranslation } from 'react-i18next'

interface TypingIndicatorProps {
  roomId: string
}

function getDisplayName(roomId: string, userId: string): string {
  const client = getMatrixClient()
  if (!client)
    return userId

  const room = client.getRoom(roomId)
  if (!room)
    return userId

  const member = room.getMember(userId)
  return member?.name ?? userId
}

export function TypingIndicator({ roomId }: TypingIndicatorProps) {
  const { t } = useTranslation()
  const typingUsers = useTypingStore(s => s.typingByRoom.get(roomId))

  const client = getMatrixClient()
  const myUserId = client?.getUserId()

  const filtered = typingUsers?.filter(uid => uid !== myUserId) ?? []

  if (filtered.length === 0)
    return null

  const names = filtered.map(uid => getDisplayName(roomId, uid))
  const text = filtered.length === 1
    ? t('typing.single', { name: names[0] })
    : filtered.length === 2
      ? t('typing.two', { name1: names[0], name2: names[1] })
      : t('typing.multiple', { name1: names[0], name2: names[1] })

  return (
    <div className="flex items-center gap-1.5 px-4 py-1 text-xs text-muted-foreground">
      <span className="inline-flex gap-0.5">
        <span className="animate-bounce-dot h-1 w-1 rounded-full bg-muted-foreground [animation-delay:0ms]" />
        <span className="animate-bounce-dot h-1 w-1 rounded-full bg-muted-foreground [animation-delay:150ms]" />
        <span className="animate-bounce-dot h-1 w-1 rounded-full bg-muted-foreground [animation-delay:300ms]" />
      </span>
      <span>{text}</span>
    </div>
  )
}
