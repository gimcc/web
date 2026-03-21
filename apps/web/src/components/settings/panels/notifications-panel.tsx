import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getNotificationPermission,
  playNotificationSound,
  requestNotificationPermission,
  useNotificationStore,
} from '../../../lib/notifications'
import { Slider } from '../../ui/slider'
import { Switch } from '../../ui/switch'

export function NotificationsPanel() {
  const { t } = useTranslation()
  const enabled = useNotificationStore(s => s.enabled)
  const setEnabled = useNotificationStore(s => s.setEnabled)
  const soundEnabled = useNotificationStore(s => s.soundEnabled)
  const setSoundEnabled = useNotificationStore(s => s.setSoundEnabled)
  const soundVolume = useNotificationStore(s => s.soundVolume)
  const setSoundVolume = useNotificationStore(s => s.setSoundVolume)
  const [permission, setPermission] = useState(getNotificationPermission)

  const handleCheckedChange = useCallback(async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission()
      setPermission(getNotificationPermission())
      if (granted) {
        setEnabled(true)
      }
    }
    else {
      setEnabled(false)
    }
  }, [setEnabled])

  const handleVolumeChange = useCallback((value: number[]) => {
    setSoundVolume(value[0]! / 100)
  }, [setSoundVolume])

  const handleVolumeCommit = useCallback(() => {
    playNotificationSound()
  }, [])

  const isUnsupported = permission === 'unsupported'
  const isDenied = permission === 'denied'
  const isSoundActive = enabled && soundEnabled

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-foreground">{t('notifications.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('notifications.description')}</p>
      </div>

      <div className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t('notifications.enable')}</p>
            <p className="text-xs text-muted-foreground">
              {isDenied
                ? t('notifications.blocked')
                : t('notifications.enable_desc')}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={checked => void handleCheckedChange(checked)}
            disabled={isUnsupported}
          />
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t('notifications.sound')}</p>
            <p className="text-xs text-muted-foreground">{t('notifications.sound_desc')}</p>
          </div>
          <Switch
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
            disabled={!enabled}
          />
        </div>

        {/* Volume slider */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{t('notifications.volume')}</p>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(soundVolume * 100)}
              %
            </span>
          </div>
          <Slider
            className="mt-3"
            value={[Math.round(soundVolume * 100)]}
            min={0}
            max={100}
            step={1}
            disabled={!isSoundActive}
            onValueChange={handleVolumeChange}
            onValueCommit={handleVolumeCommit}
          />
        </div>

        {/* Status */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            {t('notifications.permission')}
            :
            {' '}
            <span className="font-medium text-foreground">
              {permission === 'granted' && t('notifications.permission_granted')}
              {permission === 'denied' && t('notifications.permission_denied')}
              {permission === 'default' && t('notifications.permission_default')}
              {permission === 'unsupported' && t('notifications.unsupported')}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
