import type { ShowSasCallbacks, VerificationRequest } from '@matrix-web/matrix-client'
import { VerifierEvent } from '@matrix-web/matrix-client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        {phase === 'request' && (
          <>
            <h2 className="mb-2 text-lg font-semibold">{t('device_verification.request_title')}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('device_verification.request_message')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReject}>{t('device_verification.decline')}</Button>
              <Button onClick={handleAccept}>{t('device_verification.accept')}</Button>
            </div>
          </>
        )}

        {phase === 'sas' && (
          <>
            <h2 className="mb-2 text-lg font-semibold">{t('device_verification.sas_title')}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('device_verification.sas_message')}
            </p>
            <div className="mb-4 grid grid-cols-7 gap-2">
              {emojis.map(item => (
                <div key={item.description} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{item.description}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReject}>{t('device_verification.no_match')}</Button>
              <Button onClick={handleConfirmSas}>{t('device_verification.match')}</Button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <h2 className="mb-2 text-lg font-semibold">{t('device_verification.done_title')}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('device_verification.done_message')}
            </p>
            <div className="flex justify-end">
              <Button onClick={onClose}>{t('common.done')}</Button>
            </div>
          </>
        )}

        {phase === 'cancelled' && (
          <>
            <h2 className="mb-2 text-lg font-semibold">{t('device_verification.cancelled_title')}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('device_verification.cancelled_message')}
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
