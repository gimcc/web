import { getMatrixClient, useCryptoStore } from '@matrix-web/matrix-client'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { RecoveryKeyDisplayDialog } from './recovery-key-display-dialog'
import { RecoveryKeyInputDialog } from './recovery-key-input-dialog'

type SetupPhase = 'idle' | 'creating' | 'restoring' | 'resetting' | 'error'

export function KeyBackupSetup() {
  const { t } = useTranslation()
  const { keyBackupEnabled, keyBackupProgress } = useCryptoStore()
  const [phase, setPhase] = useState<SetupPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const [showInputDialog, setShowInputDialog] = useState(false)

  const handleCreateBackup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto)
      return

    setPhase('creating')
    setError(null)

    try {
      let generatedRecoveryKey: string | undefined

      await crypto.bootstrapSecretStorage({
        createSecretStorageKey: async () => {
          const key = await crypto.createRecoveryKeyFromPassphrase()
          generatedRecoveryKey = key.encodedPrivateKey
          return key
        },
        setupNewSecretStorage: true,
        setupNewKeyBackup: true,
      })

      if (generatedRecoveryKey) {
        setRecoveryKey(generatedRecoveryKey)
      }
      setPhase('idle')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('key_backup.error_create'))
      setPhase('error')
    }
  }, [t])

  const handleSetupWithPassphrase = useCallback(() => {
    setError(null)
    setShowInputDialog(true)
  }, [])

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

  const handleResetBackup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto)
      return

    setPhase('resetting')
    setError(null)

    try {
      let generatedRecoveryKey: string | undefined

      await crypto.bootstrapSecretStorage({
        createSecretStorageKey: async () => {
          const key = await crypto.createRecoveryKeyFromPassphrase()
          generatedRecoveryKey = key.encodedPrivateKey
          return key
        },
        setupNewSecretStorage: true,
        setupNewKeyBackup: true,
      })

      if (generatedRecoveryKey) {
        setRecoveryKey(generatedRecoveryKey)
      }
      setPhase('idle')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('key_backup.error_reset'))
      setPhase('error')
    }
  }, [t])

  const isBusy = phase === 'creating' || phase === 'restoring' || phase === 'resetting'

  return (
    <>
      <div className="space-y-4 rounded-lg border border-border p-4">
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

        {phase === 'error' && error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {!keyBackupEnabled && (
            <>
              <Button
                size="sm"
                onClick={handleCreateBackup}
                disabled={isBusy}
              >
                {phase === 'creating' ? t('key_backup.creating') : t('recovery_key.setup_with_key')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetupWithPassphrase}
                disabled={isBusy}
              >
                {t('recovery_key.setup_with_passphrase')}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInputDialog(true)}
            disabled={isBusy}
          >
            {t('key_backup.restore')}
          </Button>
          {keyBackupEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetBackup}
              disabled={isBusy}
            >
              {phase === 'resetting' ? t('key_backup.resetting') : t('key_backup.reset')}
            </Button>
          )}
        </div>
      </div>

      {recoveryKey && (
        <RecoveryKeyDisplayDialog
          recoveryKey={recoveryKey}
          onClose={() => setRecoveryKey(null)}
        />
      )}

      <RecoveryKeyInputDialog
        open={showInputDialog}
        onClose={() => setShowInputDialog(false)}
        onRecovered={handleRestoreBackup}
      />
    </>
  )
}
