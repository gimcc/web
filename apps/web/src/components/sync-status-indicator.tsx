import type { Cloud } from 'lucide-react'
import { useConnectionStore } from '@matrix-web/matrix-client'
import { CloudOff, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

export function SyncStatusIndicator() {
  const { t } = useTranslation()
  const status = useConnectionStore(s => s.status)
  const lastSyncTimestamp = useConnectionStore(s => s.lastSyncTimestamp)
  const error = useConnectionStore(s => s.error)

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncTimestamp)
      return null
    const date = new Date(lastSyncTimestamp)
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }, [lastSyncTimestamp])

  // Only show when not in normal syncing state
  if (status === 'syncing') {
    return null
  }

  const config: Record<string, { icon: typeof Cloud, color: string, animate?: boolean }> = {
    connecting: { icon: Loader2, color: 'text-yellow-500', animate: true },
    reconnecting: { icon: RefreshCw, color: 'text-yellow-500', animate: true },
    error: { icon: CloudOff, color: 'text-red-500' },
    disconnected: { icon: WifiOff, color: 'text-gray-500' },
  }

  const { icon: Icon, color, animate } = config[status] ?? { icon: CloudOff, color: 'text-gray-500' }

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-accent/50 px-2 py-1">
      <Icon className={cn('h-3.5 w-3.5', color, animate && 'animate-spin')} />
      <span className="text-xs text-muted-foreground">
        {t(`sync_status.${status}`)}
      </span>
      {lastSyncLabel && status === 'error' && (
        <span className="text-[10px] text-muted-foreground/60">
          {t('sync_status.last_sync', { time: lastSyncLabel })}
        </span>
      )}
      {error && status === 'error' && (
        <span className="text-[10px] text-destructive" title={error}>
          {error.slice(0, 30)}
        </span>
      )}
    </div>
  )
}
