import { getMatrixClient } from '@matrix-web/matrix-client'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { RecoveryKeyDisplayDialog } from './recovery-key-display-dialog'

type SetupPhase = 'confirm' | 'in-progress' | 'success' | 'error'

interface SecretStorageSetupDialogProps {
  open: boolean
  onClose: () => void
  mode: 'setup' | 'reset'
}

export function SecretStorageSetupDialog({ open, onClose, mode }: SecretStorageSetupDialogProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<SetupPhase>('confirm')
  const [error, setError] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const [tab, setTab] = useState<string>('key')
  const [passphrase, setPassphrase] = useState('')
  const [passphraseConfirm, setPassphraseConfirm] = useState('')
  const [passphraseError, setPassphraseError] = useState<string | null>(null)

  const isReset = mode === 'reset'

  const handleSetupWithKey = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto) {
      setError(t('secret_storage.error_no_crypto'))
      setPhase('error')
      return
    }

    setPhase('in-progress')
    setError(null)

    try {
      let generatedKey: string | undefined

      await crypto.bootstrapSecretStorage({
        createSecretStorageKey: async () => {
          const key = await crypto.createRecoveryKeyFromPassphrase()
          generatedKey = key.encodedPrivateKey
          return key
        },
        setupNewSecretStorage: true,
      })

      if (generatedKey) {
        setRecoveryKey(generatedKey)
      }
      setPhase('success')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('secret_storage.error_generic'))
      setPhase('error')
    }
  }, [t])

  const handleSetupWithPassphrase = useCallback(async () => {
    if (passphrase.length < 8) {
      setPassphraseError(t('secret_storage.passphrase_too_short'))
      return
    }
    if (passphrase !== passphraseConfirm) {
      setPassphraseError(t('secret_storage.passphrase_mismatch'))
      return
    }

    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto) {
      setError(t('secret_storage.error_no_crypto'))
      setPhase('error')
      return
    }

    setPhase('in-progress')
    setError(null)
    setPassphraseError(null)

    try {
      let generatedKey: string | undefined

      await crypto.bootstrapSecretStorage({
        createSecretStorageKey: async () => {
          const key = await crypto.createRecoveryKeyFromPassphrase(passphrase)
          generatedKey = key.encodedPrivateKey
          return key
        },
        setupNewSecretStorage: true,
      })

      if (generatedKey) {
        setRecoveryKey(generatedKey)
      }
      setPhase('success')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('secret_storage.error_generic'))
      setPhase('error')
    }
  }, [passphrase, passphraseConfirm, t])

  const handleSetup = useCallback(() => {
    if (tab === 'passphrase') {
      handleSetupWithPassphrase()
    }
    else {
      handleSetupWithKey()
    }
  }, [tab, handleSetupWithKey, handleSetupWithPassphrase])

  const handleClose = useCallback(() => {
    setPhase('confirm')
    setError(null)
    setPassphrase('')
    setPassphraseConfirm('')
    setPassphraseError(null)
    setTab('key')
    onClose()
  }, [onClose])

  const handleRecoveryKeyDismissed = useCallback(() => {
    setRecoveryKey(null)
    handleClose()
  }, [handleClose])

  const titleKey = isReset ? 'secret_storage.reset_title' : 'secret_storage.setup_title'
  const descKey = isReset ? 'secret_storage.reset_description' : 'secret_storage.setup_description'

  const canSubmitPassphrase = passphrase.length >= 8 && passphrase === passphraseConfirm

  return (
    <>
      <Dialog open={open && !recoveryKey} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          {phase === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>{t(titleKey)}</DialogTitle>
                <DialogDescription>{t(descKey)}</DialogDescription>
              </DialogHeader>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="key">{t('secret_storage.tab_key')}</TabsTrigger>
                  <TabsTrigger value="passphrase">{t('secret_storage.tab_passphrase')}</TabsTrigger>
                </TabsList>

                <TabsContent value="key" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    {t('secret_storage.key_description')}
                  </p>
                </TabsContent>

                <TabsContent value="passphrase" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    {t('secret_storage.passphrase_description')}
                  </p>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      value={passphrase}
                      onChange={e => setPassphrase(e.target.value)}
                      placeholder={t('secret_storage.passphrase_placeholder')}
                    />
                    <Input
                      type="password"
                      value={passphraseConfirm}
                      onChange={e => setPassphraseConfirm(e.target.value)}
                      placeholder={t('secret_storage.passphrase_confirm_placeholder')}
                    />
                    {passphraseError && (
                      <p className="text-xs text-destructive">{passphraseError}</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
                <Button
                  onClick={handleSetup}
                  disabled={tab === 'passphrase' && !canSubmitPassphrase}
                >
                  {isReset ? t('secret_storage.reset_confirm') : t('secret_storage.setup_confirm')}
                </Button>
              </DialogFooter>
            </>
          )}

          {phase === 'in-progress' && (
            <>
              <DialogHeader>
                <DialogTitle>{t(titleKey)}</DialogTitle>
                <DialogDescription>{t('secret_storage.setting_up')}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </>
          )}

          {phase === 'success' && !recoveryKey && (
            <>
              <DialogHeader>
                <DialogTitle>{t('secret_storage.success_title')}</DialogTitle>
                <DialogDescription>{t('secret_storage.success_message')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleClose}>{t('common.done')}</Button>
              </DialogFooter>
            </>
          )}

          {phase === 'error' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('secret_storage.error_title')}</DialogTitle>
                <DialogDescription className="text-destructive">
                  {error}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>{t('common.close')}</Button>
                <Button onClick={() => setPhase('confirm')}>{t('secret_storage.retry')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {recoveryKey && (
        <RecoveryKeyDisplayDialog
          recoveryKey={recoveryKey}
          onClose={handleRecoveryKeyDismissed}
        />
      )}
    </>
  )
}
