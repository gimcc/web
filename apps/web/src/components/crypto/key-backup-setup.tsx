import { useCryptoStore } from '@matrix-web/matrix-client'
import { useTranslation } from 'react-i18next'
import { Progress } from '../ui/progress'

/**
 * Key backup status display.
 *
 * Key backup is now managed by the unified DeviceVerificationSetup flow.
 * This component only shows current status and progress.
 */
export function KeyBackupSetup() {
  const { t } = useTranslation()
  const { keyBackupEnabled, keyBackupProgress } = useCryptoStore()

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">{t('key_backup.title')}</h3>
        <p className="text-xs text-muted-foreground">
          {keyBackupEnabled
            ? t('key_backup.enabled_message')
            : t('key_backup.disabled_message')}
        </p>
      </div>

      {keyBackupProgress && (
        <div className="space-y-1">
          <Progress value={Math.round((keyBackupProgress.current / keyBackupProgress.total) * 100)} />
          <p className="text-xs text-muted-foreground">
            {t('key_backup.progress', { current: keyBackupProgress.current, total: keyBackupProgress.total })}
          </p>
        </div>
      )}
    </div>
  )
}
