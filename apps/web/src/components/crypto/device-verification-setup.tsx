import { clearSecretStorageKeys, getMatrixClient, MatrixError, refreshCryptoStatus } from '@matrix-web/matrix-client'
import { Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

type Phase = 'form' | 'uia' | 'in-progress' | 'done'

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
  const [phase, setPhase] = useState<Phase>('form')
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const [uiaPassword, setUiaPassword] = useState('')
  const [uiaSession, setUiaSession] = useState<string | null>(null)
  const [pendingMakeRequest, setPendingMakeRequest] = useState<{
    makeRequest: (authDict: Record<string, unknown>) => Promise<void>
    resolve: () => void
    reject: (err: unknown) => void
  } | null>(null)

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
        authUploadDeviceSigningKeys: async (makeRequest) => {
          // Try without auth first
          try {
            await makeRequest(null as unknown as Record<string, unknown>)
          }
          catch (err) {
            if (err instanceof MatrixError && err.httpStatus === 401) {
              const authData = err.data as { session?: string }
              if (authData.session) {
                // Show UIA password prompt and wait for user to submit
                return new Promise<void>((resolve, reject) => {
                  setUiaSession(authData.session ?? null)
                  setPendingMakeRequest({ makeRequest: makeRequest as (authDict: Record<string, unknown>) => Promise<void>, resolve, reject })
                  setPhase('uia')
                })
              }
            }
            throw err
          }
        },
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
      if (phase !== 'uia') {
        setError(err instanceof Error ? err.message : t('verification_setup.error_generic'))
        setPhase('form')
      }
    }
  }, [passphrase, isReset, t, phase])

  const handleUiaSubmit = useCallback(async () => {
    if (!pendingMakeRequest || !uiaSession) return

    const client = getMatrixClient()
    const userId = client?.getUserId()
    if (!userId) return

    setPhase('in-progress')
    try {
      await pendingMakeRequest.makeRequest({
        type: 'm.login.password',
        session: uiaSession,
        identifier: {
          type: 'm.id.user',
          user: userId,
        },
        password: uiaPassword,
      })
      pendingMakeRequest.resolve()
    }
    catch (err) {
      pendingMakeRequest.reject(err)
      setError(err instanceof Error ? err.message : t('verification_setup.error_uia'))
      setPhase('form')
    }
    finally {
      setPendingMakeRequest(null)
      setUiaSession(null)
      setUiaPassword('')
    }
  }, [pendingMakeRequest, uiaSession, uiaPassword, t])

  const handleClose = useCallback(() => {
    if (pendingMakeRequest) {
      pendingMakeRequest.reject(new Error('Cancelled'))
    }
    setPhase('form')
    setPassphrase('')
    setError(null)
    setRecoveryKey(null)
    setUiaPassword('')
    setUiaSession(null)
    setPendingMakeRequest(null)
    onClose()
  }, [onClose, pendingMakeRequest])

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

          {phase === 'uia' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('verification_setup.uia_title')}</DialogTitle>
                <DialogDescription>{t('verification_setup.uia_description')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Input
                  type="password"
                  value={uiaPassword}
                  onChange={e => setUiaPassword(e.target.value)}
                  placeholder={t('verification_setup.uia_password_placeholder')}
                  onKeyDown={e => e.key === 'Enter' && handleUiaSubmit()}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUiaSubmit} disabled={!uiaPassword.trim()}>
                  {t('verification_setup.uia_confirm')}
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

      {recoveryKey && (
        <RecoveryKeyDisplayDialog
          recoveryKey={recoveryKey}
          onClose={handleRecoveryKeySaved}
        />
      )}
    </>
  )
}
