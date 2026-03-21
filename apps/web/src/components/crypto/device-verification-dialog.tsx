import type { ShowQrCodeCallbacks, ShowSasCallbacks, VerificationRequest } from '@matrix-web/matrix-client'
import { VerificationPhase, VerificationRequestEvent, VerifierEvent } from '@matrix-web/matrix-client'
import { Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
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

type DialogPhase = 'waiting' | 'request' | 'qr' | 'qr-scanned' | 'sas' | 'done' | 'cancelled'

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
  const [phase, setPhase] = useState<DialogPhase>(() => {
    if (request.initiatedByMe) {
      return request.phase === VerificationPhase.Ready ? 'qr' : 'waiting'
    }
    return 'request'
  })
  const [emojis, setEmojis] = useState<EmojiItem[]>([])
  const [sasCallbacks, setSasCallbacks] = useState<ShowSasCallbacks | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCallbacks, setQrCallbacks] = useState<ShowQrCodeCallbacks | null>(null)
  const verifyPromiseRef = useRef<Promise<void> | null>(null)

  // Listen for verification request phase changes (e.g. other side accepts)
  useEffect(() => {
    function onRequestChange() {
      const p = request.phase
      if (p === VerificationPhase.Ready && phase === 'waiting') {
        setPhase('qr')
      }
      else if (p === VerificationPhase.Done) {
        setPhase('done')
      }
      else if (p === VerificationPhase.Cancelled) {
        setPhase('cancelled')
      }
    }

    request.on(VerificationRequestEvent.Change, onRequestChange)
    return () => {
      request.off(VerificationRequestEvent.Change, onRequestChange)
    }
  }, [request, phase])

  // Generate QR code when entering the QR phase
  useEffect(() => {
    if (phase !== 'qr')
      return

    let cancelled = false

    async function generateQr() {
      try {
        const qrData = await request.generateQRCode()
        if (cancelled || !qrData)
          return
        const dataUrl = await QRCode.toDataURL(
          [{ data: qrData, mode: 'byte' }],
          { errorCorrectionLevel: 'L', width: 256, margin: 2 },
        )
        if (!cancelled) {
          setQrCodeDataUrl(dataUrl)
        }
      }
      catch {
        // QR code generation not supported — user can fall back to emoji
      }
    }

    generateQr()
    return () => { cancelled = true }
  }, [phase, request])

  // Listen for verifier events (SAS emojis, QR reciprocate, cancel)
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

    function onShowReciprocateQr(qr: ShowQrCodeCallbacks): void {
      setQrCallbacks(qr)
      setPhase('qr-scanned')
    }

    function onCancel(): void {
      setPhase('cancelled')
    }

    verifier.on(VerifierEvent.ShowSas, onShowSas)
    verifier.on(VerifierEvent.ShowReciprocateQr, onShowReciprocateQr)
    verifier.on(VerifierEvent.Cancel, onCancel)

    return () => {
      verifier.off(VerifierEvent.ShowSas, onShowSas)
      verifier.off(VerifierEvent.ShowReciprocateQr, onShowReciprocateQr)
      verifier.off(VerifierEvent.Cancel, onCancel)
    }
  }, [request, request.verifier])

  const handleAccept = useCallback(async () => {
    try {
      const verifier = request.verifier
      if (verifier) {
        verifyPromiseRef.current = verifier.verify()
        await verifyPromiseRef.current
        setPhase('done')
      }
      else {
        await request.accept()
        // After accepting, transition to QR/ready phase
        if (request.phase === VerificationPhase.Ready) {
          setPhase('qr')
        }
      }
    }
    catch {
      setPhase('cancelled')
    }
  }, [request])

  const handleStartSas = useCallback(async () => {
    try {
      const verifier = await request.startVerification('m.sas.v1')
      verifyPromiseRef.current = verifier.verify()
      await verifyPromiseRef.current
      setPhase('done')
    }
    catch {
      if (phase !== 'sas' && phase !== 'done') {
        setPhase('cancelled')
      }
    }
  }, [request, phase])

  const handleConfirmSas = useCallback(async () => {
    try {
      await sasCallbacks?.confirm()
      setPhase('done')
    }
    catch {
      setPhase('cancelled')
    }
  }, [sasCallbacks])

  const handleConfirmQr = useCallback(async () => {
    try {
      qrCallbacks?.confirm()
      setPhase('done')
    }
    catch {
      setPhase('cancelled')
    }
  }, [qrCallbacks])

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
        {/* Waiting for other device to accept (outgoing request) */}
        {phase === 'waiting' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('device_verification.outgoing_title')}</DialogTitle>
              <DialogDescription>{t('device_verification.outgoing_message')}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleReject}>{t('common.cancel')}</Button>
            </DialogFooter>
          </>
        )}

        {/* Incoming request — accept or decline */}
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

        {/* QR code display — ready phase */}
        {phase === 'qr' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('device_verification.qr_title')}</DialogTitle>
              <DialogDescription>{t('device_verification.qr_message')}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              {qrCodeDataUrl
                ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Verification QR Code"
                      className="h-64 w-64 rounded-lg border border-border bg-white p-2"
                    />
                  )
                : (
                    <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-border bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
              <Button variant="outline" onClick={handleStartSas}>
                {t('device_verification.qr_or_emoji')}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleReject}>{t('common.cancel')}</Button>
            </DialogFooter>
          </>
        )}

        {/* QR code scanned by other device — confirm */}
        {phase === 'qr-scanned' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('device_verification.qr_scanned_title')}</DialogTitle>
              <DialogDescription>{t('device_verification.qr_scanned_message')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleReject}>{t('common.cancel')}</Button>
              <Button onClick={handleConfirmQr}>{t('device_verification.qr_confirm')}</Button>
            </DialogFooter>
          </>
        )}

        {/* SAS emoji comparison */}
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

        {/* Verification complete */}
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

        {/* Verification cancelled */}
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
