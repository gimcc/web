import { getMatrixClient, useTypingStore } from '@matrix-web/matrix-client'

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

function formatTypingText(names: string[]): string {
  if (names.length === 0)
    return ''
  if (names.length === 1)
    return `${names[0]} is typing`
  if (names.length === 2)
    return `${names[0]} and ${names[1]} are typing`
  return `${names[0]}, ${names[1]} and others are typing`
}

export function TypingIndicator({ roomId }: TypingIndicatorProps) {
  const typingUsers = useTypingStore(s => s.typingByRoom.get(roomId))

  const client = getMatrixClient()
  const myUserId = client?.getUserId()

  const filtered = typingUsers?.filter(uid => uid !== myUserId) ?? []

  if (filtered.length === 0)
    return null

  const names = filtered.map(uid => getDisplayName(roomId, uid))
  const text = formatTypingText(names)

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
