import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getNotificationPermission,
  requestNotificationPermission,
  useNotificationStore,
} from '../../../lib/notifications'
import { Switch } from '../../ui/switch'

export function NotificationsPanel() {
  const { t } = useTranslation()
  const enabled = useNotificationStore(s => s.enabled)
  const setEnabled = useNotificationStore(s => s.setEnabled)
  const permission = getNotificationPermission()

  const handleCheckedChange = useCallback(async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission()
      if (granted) {
        setEnabled(true)
      }
    }
    else {
      setEnabled(false)
    }
  }, [setEnabled])

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
              {permission === 'denied'
                ? t('notifications.blocked')
                : t('notifications.enable_desc')}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={checked => void handleCheckedChange(checked)}
            disabled={permission === 'denied'}
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
