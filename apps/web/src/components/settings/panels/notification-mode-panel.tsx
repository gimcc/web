import type { RoomNotificationLevel } from '@matrix-web/matrix-client'
import {
  getRoomNotificationLevel,
  setRoomNotificationLevel,
} from '@matrix-web/matrix-client'
import { Bell, BellMinus, BellOff } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const MODES: { value: RoomNotificationLevel, icon: typeof Bell, labelKey: string, descKey: string }[] = [
  { value: 'all', icon: Bell, labelKey: 'notification_mode.all', descKey: 'notification_mode.all_desc' },
  { value: 'mentions', icon: BellMinus, labelKey: 'notification_mode.mentions', descKey: 'notification_mode.mentions_desc' },
  { value: 'mute', icon: BellOff, labelKey: 'notification_mode.mute', descKey: 'notification_mode.mute_desc' },
]

interface NotificationModePanelProps {
  roomId: string
}

export function NotificationModePanel({ roomId }: NotificationModePanelProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<RoomNotificationLevel>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMode(getRoomNotificationLevel(roomId))
  }, [roomId])

  const handleChange = useCallback(async (value: RoomNotificationLevel) => {
    const prev = mode
    setMode(value)
    setError(null)

    try {
      await setRoomNotificationLevel(roomId, value)
    }
    catch {
      setMode(prev)
      setError(t('room.error_settings'))
    }
  }, [roomId, mode, t])

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">{t('notification_mode.title')}</h4>

      <div className="space-y-2">
        {MODES.map(({ value, icon: Icon, labelKey, descKey }) => (
          <button
            key={value}
            type="button"
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              mode === value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-accent/50'
            }`}
            onClick={() => void handleChange(value)}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${mode === value ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
              <p className="text-xs text-muted-foreground">{t(descKey)}</p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
