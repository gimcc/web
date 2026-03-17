import { getMatrixClient, useCryptoStore } from '@matrix-web/matrix-client'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

type SetupPhase = 'idle' | 'creating' | 'restoring' | 'error'

export function KeyBackupSetup() {
  const { t } = useTranslation()
  const { keyBackupEnabled, keyBackupProgress } = useCryptoStore()
  const [phase, setPhase] = useState<SetupPhase>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleCreateBackup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto)
      return

    setPhase('creating')
    setError(null)

    try {
      await crypto.resetKeyBackup()
      setPhase('idle')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('key_backup.error_create'))
      setPhase('error')
    }
  }, [t])

  const handleRestoreBackup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto)
      return

    setPhase('restoring')
    setError(null)

    try {
      const info = await crypto.checkKeyBackupAndEnable()
      if (info) {
        setPhase('idle')
      }
      else {
        setError(t('key_backup.error_no_backup'))
        setPhase('error')
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('key_backup.error_restore'))
      setPhase('error')
    }
  }, [t])

  return (
    <div className="space-y-4 rounded-lg border p-4">
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
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.round((keyBackupProgress.current / keyBackupProgress.total) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('key_backup.progress', { current: keyBackupProgress.current, total: keyBackupProgress.total })}
          </p>
        </div>
      )}

      {phase === 'error' && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        {!keyBackupEnabled && (
          <Button
            size="sm"
            onClick={handleCreateBackup}
            disabled={phase === 'creating' || phase === 'restoring'}
          >
            {phase === 'creating' ? t('key_backup.creating') : t('key_backup.setup')}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRestoreBackup}
          disabled={phase === 'creating' || phase === 'restoring'}
        >
          {phase === 'restoring' ? t('key_backup.restoring') : t('key_backup.restore')}
        </Button>
      </div>
    </div>
  )
}
