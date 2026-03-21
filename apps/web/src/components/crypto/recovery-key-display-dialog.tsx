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

interface RecoveryKeyDisplayDialogProps {
  recoveryKey: string
  onClose: () => void
}

export function RecoveryKeyDisplayDialog({ recoveryKey, onClose }: RecoveryKeyDisplayDialogProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey)
      setCopied(true)
      setTimeout(setCopied, 2000, false)
    }
    catch {
      // Clipboard access denied or page not focused — user can still copy manually via select-all
    }
  }, [recoveryKey])

  const handleDownload = useCallback(() => {
    const blob = new Blob([recoveryKey], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = t('recovery_key.download_filename')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [recoveryKey, t])

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('recovery_key.display_title')}</DialogTitle>
          <DialogDescription>{t('recovery_key.display_description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground">
            {t('recovery_key.key_label')}
          </label>
          <div className="rounded-md border border-border bg-muted p-3 font-mono text-sm break-all select-all">
            {recoveryKey}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? t('recovery_key.copied') : t('recovery_key.copy')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              {t('recovery_key.download')}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>{t('recovery_key.confirm_saved')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
