import { clearSecretStorageKeys, getMatrixClient, refreshCryptoStatus } from '@matrix-web/matrix-client'
import { Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiaAuth } from '../../hooks/use-uia-auth'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { RecoveryKeyDisplayDialog } from './recovery-key-display-dialog'

type Phase = 'form' | 'in-progress' | 'done'

interface DeviceVerificationSetupProps {
  open: boolean
  onClose: () => void
  mode?: 'setup' | 'reset'
}

/**
 * Unified E2EE bootstrap dialog.
 *
 * Performs the correct sequence:
 * 1. Create recovery key (optionally from passphrase)
 * 2. Bootstrap secret storage (SSSS)
 * 3. Bootstrap cross-signing (with UIA handling)
 * 4. Create key backup
 * 5. Display recovery key for user to save
 */
export function DeviceVerificationSetup({ open, onClose, mode = 'setup' }: DeviceVerificationSetupProps) {
  const { t } = useTranslation()
  const { authUploadDeviceSigningKeys, UiaDialog, cancelUia } = useUiaAuth()
  const [phase, setPhase] = useState<Phase>('form')
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)

  const isReset = mode === 'reset'

  const doSetup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto || !client) {
      setError(t('verification_setup.error_no_crypto'))
      return
    }

    setPhase('in-progress')
    setError(null)

    try {
      // 1. Create recovery key (optionally derived from passphrase)
      const passphraseValue = passphrase.trim() || undefined
      const recoveryKeyData = await crypto.createRecoveryKeyFromPassphrase(passphraseValue)
      if (!recoveryKeyData.encodedPrivateKey) {
        throw new Error('Failed to create recovery key.')
      }

      // 2. Clear stale cached keys
      clearSecretStorageKeys()

      // 3. Bootstrap SSSS first
      await crypto.bootstrapSecretStorage({
        createSecretStorageKey: async () => recoveryKeyData,
        setupNewSecretStorage: isReset || true,
      })

      // 4. Bootstrap cross-signing with UIA handling
      await crypto.bootstrapCrossSigning({
        authUploadDeviceSigningKeys,
        setupNewCrossSigning: isReset || true,
      })

      // 5. Create key backup
      await crypto.resetKeyBackup()

      // 6. Refresh crypto status in the store
      await refreshCryptoStatus(client)

      // 7. Show recovery key
      setRecoveryKey(recoveryKeyData.encodedPrivateKey)
      setPhase('done')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('verification_setup.error_generic'))
      setPhase('form')
    }
  }, [passphrase, isReset, t, authUploadDeviceSigningKeys])

  const handleClose = useCallback(() => {
    cancelUia()
    setPhase('form')
    setPassphrase('')
    setError(null)
    setRecoveryKey(null)
    onClose()
  }, [onClose, cancelUia])

  const handleRecoveryKeySaved = useCallback(() => {
    setRecoveryKey(null)
    handleClose()
  }, [handleClose])

  return (
    <>
      <Dialog open={open && !recoveryKey} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          {phase === 'form' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {isReset
                    ? t('verification_setup.reset_title')
                    : t('verification_setup.setup_title')}
                </DialogTitle>
                <DialogDescription>
                  {isReset
                    ? t('verification_setup.reset_description')
                    : t('verification_setup.setup_description')}
                </DialogDescription>
              </DialogHeader>

              {isReset && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive">
                    {t('verification_setup.reset_warning')}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('verification_setup.passphrase_label')}
                </label>
                <Input
                  type="password"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  placeholder={t('verification_setup.passphrase_placeholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('verification_setup.passphrase_hint')}
                </p>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={doSetup} variant={isReset ? 'destructive' : 'default'}>
                  {t('verification_setup.continue')}
                </Button>
              </DialogFooter>
            </>
          )}

          {phase === 'in-progress' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('verification_setup.in_progress_title')}</DialogTitle>
                <DialogDescription>{t('verification_setup.in_progress_description')}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <UiaDialog />

      {recoveryKey && (
        <RecoveryKeyDisplayDialog
          recoveryKey={recoveryKey}
          onClose={handleRecoveryKeySaved}
        />
      )}
    </>
  )
}
