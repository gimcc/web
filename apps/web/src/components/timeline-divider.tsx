import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1)
  const d2 = new Date(ts2)
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
}

export function DayDivider({ label, timestamp }: { label: string, timestamp?: number }) {
  const { t } = useTranslation()

  const localizedLabel = useMemo(() => {
    if (timestamp == null) return label
    const now = Date.now()
    if (isSameDay(timestamp, now)) return t('chat.today', 'Today')
    if (isSameDay(timestamp, now - 86400000)) return t('chat.yesterday', 'Yesterday')
    return label
  }, [label, timestamp, t])

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">{localizedLabel}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function UnreadDivider() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="h-px flex-1 bg-destructive/50" />
      <span className="text-xs font-semibold text-destructive">{t('chat.new_messages', 'New Messages')}</span>
      <div className="h-px flex-1 bg-destructive/50" />
    </div>
  )
}
