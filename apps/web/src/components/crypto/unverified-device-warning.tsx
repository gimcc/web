import { ShieldAlert } from 'lucide-react'
import { cn } from '../../lib/utils'

interface UnverifiedDeviceWarningProps {
  className?: string
}

export function UnverifiedDeviceWarning({ className }: UnverifiedDeviceWarningProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2',
        className,
      )}
    >
      <ShieldAlert className="size-4 shrink-0 text-yellow-500" />
      <p className="text-xs text-yellow-700 dark:text-yellow-400">
        This room has unverified devices. Messages may not be fully secure.
      </p>
    </div>
  )
}
