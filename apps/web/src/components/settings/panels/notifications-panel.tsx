import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getNotificationPermission,
  requestNotificationPermission,
  useNotificationStore,
} from '../../../lib/notifications'

export function NotificationsPanel() {
  const { t } = useTranslation()
  const enabled = useNotificationStore(s => s.enabled)
  const setEnabled = useNotificationStore(s => s.setEnabled)
  const permission = getNotificationPermission()

  const handleToggle = useCallback(async () => {
    if (!enabled) {
      const granted = await requestNotificationPermission()
      if (granted) {
        setEnabled(true)
      }
    } else {
      setEnabled(false)
    }
  }, [enabled, setEnabled])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-foreground">{t('settings.notifications.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.notifications.description')}</p>
      </div>

      <div className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t('settings.notifications.enable')}</p>
            <p className="text-xs text-muted-foreground">
              {permission === 'denied'
                ? t('settings.notifications.blocked')
                : t('settings.notifications.enable_desc')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={permission === 'denied'}
            className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'} disabled:opacity-50`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        </div>

        {/* Status */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            {t('settings.notifications.permission')}:
            {' '}
            <span className="font-medium text-foreground">
              {permission === 'granted' && t('settings.notifications.permission_granted')}
              {permission === 'denied' && t('settings.notifications.permission_denied')}
              {permission === 'default' && t('settings.notifications.permission_default')}
              {permission === 'unsupported' && t('settings.notifications.unsupported')}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
