import {
  decodeRecoveryKey,
  deriveRecoveryKeyFromPassphrase,
  getMatrixClient,
  refreshCryptoStatus,
  storePrivateKey,
} from '@matrix-web/matrix-client'
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

interface ManualVerificationProps {
  open: boolean
  onClose: () => void
  /** The default secret storage key ID from account data */
  secretStorageKeyId?: string
  /** The secret storage key content (contains passphrase info if set) */
  secretStorageKeyContent?: {
    passphrase?: {
      algorithm: string
      salt: string
      iterations: number
      bits: number
    }
  }
}

/**
 * Manual verification for a new device.
 *
 * When a user logs in on a new device where cross-signing is already active,
 * they need to enter their recovery key or passphrase to:
 * 1. Cache the decoded key
 * 2. Load cross-signing keys from SSSS
 * 3. Load key backup keys from SSSS
 */
export function ManualVerification({
  open,
  onClose,
  secretStorageKeyId,
  secretStorageKeyContent,
}: ManualVerificationProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<string>(
    secretStorageKeyContent?.passphrase ? 'passphrase' : 'key',
  )
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('')
  const [passphraseInput, setPassphraseInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasPassphrase = !!secretStorageKeyContent?.passphrase

  const verifyAndRestore = useCallback(async (decodedKey: Uint8Array) => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto || !client || !secretStorageKeyId) {
      throw new Error('Crypto not available')
    }

    // Validate the key against secret storage
    const keyContent = client.getAccountData(`m.secret_storage.key.${secretStorageKeyId}`)?.getContent()
    if (keyContent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = await client.secretStorage.checkKey(decodedKey, keyContent as any)
      if (!match) {
        throw new Error(t('manual_verification.error_invalid_key'))
      }
    }

    // Cache the decoded recovery key
    storePrivateKey(secretStorageKeyId, decodedKey)

    // Load existing cross-signing keys from SSSS (no auth needed)
    await crypto.bootstrapCrossSigning({})

    // Load existing secret storage keys from SSSS
    await crypto.bootstrapSecretStorage({})

    // Restore session backup keys
    await crypto.loadSessionBackupPrivateKeyFromSecretStorage()

    // Refresh crypto status in the store
    await refreshCryptoStatus(client)
  }, [secretStorageKeyId, t])

  const handleRecoverWithKey = useCallback(async () => {
    if (!recoveryKeyInput.trim()) return

    setIsVerifying(true)
    setError(null)

    try {
      const decoded = decodeRecoveryKey(recoveryKeyInput.trim())
      await verifyAndRestore(decoded)
      setSuccess(true)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('manual_verification.error_invalid_key'))
    }
    finally {
      setIsVerifying(false)
    }
  }, [recoveryKeyInput, verifyAndRestore, t])

  const handleRecoverWithPassphrase = useCallback(async () => {
    if (!passphraseInput.trim() || !secretStorageKeyContent?.passphrase) return

    setIsVerifying(true)
    setError(null)

    try {
      const { salt, iterations, bits } = secretStorageKeyContent.passphrase
      const decoded = await deriveRecoveryKeyFromPassphrase(
        passphraseInput,
        salt,
        iterations,
        bits,
      )
      await verifyAndRestore(decoded)
      setSuccess(true)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('manual_verification.error_invalid_passphrase'))
    }
    finally {
      setIsVerifying(false)
    }
  }, [passphraseInput, secretStorageKeyContent, verifyAndRestore, t])

  const handleClose = useCallback(() => {
    setRecoveryKeyInput('')
    setPassphraseInput('')
    setError(null)
    setSuccess(false)
    onClose()
  }, [onClose])

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {success
          ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t('manual_verification.success_title')}</DialogTitle>
                  <DialogDescription>{t('manual_verification.success_message')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button onClick={handleClose}>{t('common.done')}</Button>
                </DialogFooter>
              </>
            )
          : (
              <>
                <DialogHeader>
                  <DialogTitle>{t('manual_verification.title')}</DialogTitle>
                  <DialogDescription>{t('manual_verification.description')}</DialogDescription>
                </DialogHeader>

                <Tabs value={tab} onValueChange={setTab}>
                  {hasPassphrase && (
                    <TabsList className="w-full">
                      <TabsTrigger value="passphrase">{t('recovery_key.tab_passphrase')}</TabsTrigger>
                      <TabsTrigger value="key">{t('recovery_key.tab_key')}</TabsTrigger>
                    </TabsList>
                  )}

                  {hasPassphrase && (
                    <TabsContent value="passphrase" className="space-y-3 pt-3">
                      <Input
                        type="password"
                        value={passphraseInput}
                        onChange={e => setPassphraseInput(e.target.value)}
                        placeholder={t('recovery_key.passphrase_placeholder')}
                        disabled={isVerifying}
                        onKeyDown={e => e.key === 'Enter' && handleRecoverWithPassphrase()}
                        autoFocus
                      />
                      <DialogFooter>
                        <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
                          {t('common.cancel')}
                        </Button>
                        <Button
                          onClick={handleRecoverWithPassphrase}
                          disabled={isVerifying || !passphraseInput.trim()}
                        >
                          {isVerifying
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('manual_verification.verifying')}</>
                            : t('manual_verification.verify')}
                        </Button>
                      </DialogFooter>
                    </TabsContent>
                  )}

                  <TabsContent value="key" className="space-y-3 pt-3">
                    <Input
                      value={recoveryKeyInput}
                      onChange={e => setRecoveryKeyInput(e.target.value)}
                      placeholder={t('recovery_key.input_placeholder')}
                      className="font-mono text-sm"
                      disabled={isVerifying}
                      onKeyDown={e => e.key === 'Enter' && handleRecoverWithKey()}
                      autoFocus={!hasPassphrase}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
                        {t('common.cancel')}
                      </Button>
                      <Button
                        onClick={handleRecoverWithKey}
                        disabled={isVerifying || !recoveryKeyInput.trim()}
                      >
                        {isVerifying
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('manual_verification.verifying')}</>
                          : t('manual_verification.verify')}
                      </Button>
                    </DialogFooter>
                  </TabsContent>
                </Tabs>

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </>
            )}
      </DialogContent>
    </Dialog>
  )
}
