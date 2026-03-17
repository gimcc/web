import { usePresenceStore } from '@matrix-web/matrix-client'
import { cn } from '../../lib/utils'

interface PresenceDotProps {
  userId: string
  size?: 'sm' | 'md'
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
} as const

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  unavailable: 'bg-yellow-500',
  offline: 'bg-gray-400',
}

export function PresenceDot({ userId, size = 'sm' }: PresenceDotProps) {
  const presence = usePresenceStore(s => s.presenceByUser.get(userId))

  const status = presence?.status ?? 'offline'
  const colorClass = statusColors[status] ?? statusColors.offline

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
        sizeClasses[size],
        colorClass,
      )}
      title={status}
    />
  )
}
