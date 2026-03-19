import type { ShowSasCallbacks, VerificationRequest } from '@matrix-web/matrix-client'
import { VerifierEvent } from '@matrix-web/matrix-client'
import { useCallback, useEffect, useState } from 'react'
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

type VerificationPhase = 'request' | 'sas' | 'done' | 'cancelled'

interface EmojiItem {
  emoji: string
  description: string
}

interface DeviceVerificationDialogProps {
  request: VerificationRequest
  onClose: () => void
}

export function DeviceVerificationDialog({ request, onClose }: DeviceVerificationDialogProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<VerificationPhase>('request')
  const [emojis, setEmojis] = useState<EmojiItem[]>([])
  const [sasCallbacks, setSasCallbacks] = useState<ShowSasCallbacks | null>(null)

  useEffect(() => {
    const verifier = request.verifier
    if (!verifier)
      return

    function onShowSas(sas: ShowSasCallbacks): void {
      const emojiList = sas.sas.emoji?.map(([emoji, name]) => ({
        emoji,
        description: name,
      })) ?? []
      setEmojis(emojiList)
      setSasCallbacks(sas)
      setPhase('sas')
    }

    function onCancel(): void {
      setPhase('cancelled')
    }

    verifier.on(VerifierEvent.ShowSas, onShowSas)
    verifier.on(VerifierEvent.Cancel, onCancel)

    return () => {
      verifier.off(VerifierEvent.ShowSas, onShowSas)
      verifier.off(VerifierEvent.Cancel, onCancel)
    }
  }, [request])

  const handleAccept = useCallback(async () => {
    try {
      const verifier = request.verifier
      if (verifier) {
        await verifier.verify()
        setPhase('done')
      }
      else {
        await request.accept()
      }
    }
    catch {
      setPhase('cancelled')
    }
  }, [request])

  const handleConfirmSas = useCallback(async () => {
    try {
      await sasCallbacks?.confirm()
      setPhase('done')
    }
    catch {
      setPhase('cancelled')
    }
  }, [sasCallbacks])

  const handleReject = useCallback(async () => {
    try {
      await request.cancel()
    }
    catch {
      // Already cancelled
    }
    onClose()
  }, [request, onClose])

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        {phase === 'request' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('device_verification.request_title')}</DialogTitle>
              <DialogDescription>{t('device_verification.request_message')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleReject}>{t('device_verification.decline')}</Button>
              <Button onClick={handleAccept}>{t('device_verification.accept')}</Button>
            </DialogFooter>
          </>
        )}

        {phase === 'sas' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('device_verification.sas_title')}</DialogTitle>
              <DialogDescription>{t('device_verification.sas_message')}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-7 gap-2">
              {emojis.map(item => (
                <div key={item.description} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{item.description}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleReject}>{t('device_verification.no_match')}</Button>
              <Button onClick={handleConfirmSas}>{t('device_verification.match')}</Button>
            </DialogFooter>
          </>
        )}

        {phase === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('device_verification.done_title')}</DialogTitle>
              <DialogDescription>{t('device_verification.done_message')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={onClose}>{t('common.done')}</Button>
            </DialogFooter>
          </>
        )}

        {phase === 'cancelled' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('device_verification.cancelled_title')}</DialogTitle>
              <DialogDescription>{t('device_verification.cancelled_message')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
