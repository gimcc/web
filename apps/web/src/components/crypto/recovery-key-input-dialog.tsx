import { decodeRecoveryKey, getMatrixClient } from '@matrix-web/matrix-client'
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

interface RecoveryKeyInputDialogProps {
  open: boolean
  onClose: () => void
  onRecovered?: () => void
}

export function RecoveryKeyInputDialog({ open, onClose, onRecovered }: RecoveryKeyInputDialogProps) {
  const { t } = useTranslation()
  const [recoveryKey, setRecoveryKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRecoverWithKey = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto || !recoveryKey.trim())
      return

    setIsRecovering(true)
    setError(null)

    try {
      const keyBytes = decodeRecoveryKey(recoveryKey.trim())

      await crypto.bootstrapSecretStorage({
        createSecretStorageKey: async () => ({
          privateKey: keyBytes,
        }),
      })

      await crypto.checkKeyBackupAndEnable()
      onRecovered?.()
      onClose()
    }
    catch {
      setError(t('recovery_key.error_invalid_key'))
    }
    finally {
      setIsRecovering(false)
    }
  }, [recoveryKey, t, onRecovered, onClose])

  const handleRecoverWithPassphrase = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto || !passphrase.trim())
      return

    setIsRecovering(true)
    setError(null)

    try {
      // For recovery, we provide the passphrase to bootstrapSecretStorage
      // which will use the existing key metadata (salt, iterations) from the server
      // to re-derive the key deterministically — not create a new random one
      await crypto.bootstrapSecretStorage({
        createSecretStorageKey: async () => {
          return await crypto.createRecoveryKeyFromPassphrase(passphrase)
        },
      })

      await crypto.checkKeyBackupAndEnable()
      onRecovered?.()
      onClose()
    }
    catch {
      setError(t('recovery_key.error_recover'))
    }
    finally {
      setIsRecovering(false)
    }
  }, [passphrase, t, onRecovered, onClose])

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) {
      setRecoveryKey('')
      setPassphrase('')
      setError(null)
      onClose()
    }
  }, [onClose])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('recovery_key.input_title')}</DialogTitle>
          <DialogDescription>{t('recovery_key.input_description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="key">
          <TabsList className="w-full">
            <TabsTrigger value="key">{t('recovery_key.tab_key')}</TabsTrigger>
            <TabsTrigger value="passphrase">{t('recovery_key.tab_passphrase')}</TabsTrigger>
          </TabsList>

          <TabsContent value="key" className="space-y-3 pt-3">
            <Input
              value={recoveryKey}
              onChange={e => setRecoveryKey(e.target.value)}
              placeholder={t('recovery_key.input_placeholder')}
              className="font-mono text-sm"
              disabled={isRecovering}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isRecovering}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleRecoverWithKey}
                disabled={isRecovering || !recoveryKey.trim()}
              >
                {isRecovering ? t('recovery_key.recovering') : t('recovery_key.recover')}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="passphrase" className="space-y-3 pt-3">
            <Input
              type="password"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder={t('recovery_key.passphrase_placeholder')}
              disabled={isRecovering}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isRecovering}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleRecoverWithPassphrase}
                disabled={isRecovering || !passphrase.trim()}
              >
                {isRecovering ? t('recovery_key.recovering') : t('recovery_key.recover')}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
