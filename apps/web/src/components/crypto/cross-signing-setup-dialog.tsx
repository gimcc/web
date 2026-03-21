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

type SetupPhase = 'confirm' | 'in-progress' | 'success' | 'error'

interface CrossSigningSetupDialogProps {
  open: boolean
  onClose: () => void
  mode: 'setup' | 'reset'
}

export function CrossSigningSetupDialog({ open, onClose, mode }: CrossSigningSetupDialogProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<SetupPhase>('confirm')
  const [error, setError] = useState<string | null>(null)

  const handleSetup = useCallback(async () => {
    const client = getMatrixClient()
    const crypto = client?.getCrypto()
    if (!crypto) {
      setError(t('cross_signing.error_no_crypto'))
      setPhase('error')
      return
    }

    setPhase('in-progress')
    setError(null)

    try {
      await crypto.bootstrapCrossSigning({
        authUploadDeviceSigningKeys: async (fn) => {
          await fn({})
        },
      })
      setPhase('success')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('cross_signing.error_generic'))
      setPhase('error')
    }
  }, [t])

  const handleClose = useCallback(() => {
    setPhase('confirm')
    setError(null)
    onClose()
  }, [onClose])

  const titleKey = mode === 'reset' ? 'cross_signing.reset_title' : 'cross_signing.setup_title'
  const descKey = mode === 'reset' ? 'cross_signing.reset_description' : 'cross_signing.setup_description'

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {phase === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>{t(titleKey)}</DialogTitle>
              <DialogDescription>{t(descKey)}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
              <Button onClick={handleSetup}>
                {mode === 'reset' ? t('cross_signing.reset_confirm') : t('cross_signing.setup_confirm')}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === 'in-progress' && (
          <>
            <DialogHeader>
              <DialogTitle>{t(titleKey)}</DialogTitle>
              <DialogDescription>{t('cross_signing.in_progress')}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </>
        )}

        {phase === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('cross_signing.success_title')}</DialogTitle>
              <DialogDescription>{t('cross_signing.success_message')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleClose}>{t('common.done')}</Button>
            </DialogFooter>
          </>
        )}

        {phase === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('cross_signing.error_title')}</DialogTitle>
              <DialogDescription className="text-destructive">
                {error}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>{t('common.close')}</Button>
              <Button onClick={handleSetup}>{t('cross_signing.retry')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
