import { getMatrixClient, reportEvent } from '@matrix-web/matrix-client'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

interface ReportDialogProps {
  open: boolean
  roomId: string
  eventId: string
  onClose: () => void
}

export function ReportDialog({ open, roomId, eventId, onClose }: ReportDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return

    setIsSubmitting(true)
    setError(null)

    try {
      await reportEvent(client, roomId, eventId, reason.trim())
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setReason('')
      }, 1500)
    }
    catch {
      setError(t('report.error'))
    }
    finally {
      setIsSubmitting(false)
    }
  }, [roomId, eventId, reason, onClose, t])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose()
          setReason('')
          setError(null)
          setSuccess(false)
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('report.message_title')}</DialogTitle>
        </DialogHeader>

        {success
          ? (
              <p className="py-4 text-center text-sm text-green-600 dark:text-green-400">
                {t('report.success')}
              </p>
            )
          : (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1">{t('report.reason_label')}</Label>
                  <Textarea
                    rows={4}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={t('report.reason_placeholder')}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting || !reason.trim()}
                >
                  {isSubmitting ? t('report.submitting') : t('report.submit')}
                </Button>
              </div>
            )}
      </DialogContent>
    </Dialog>
  )
}
