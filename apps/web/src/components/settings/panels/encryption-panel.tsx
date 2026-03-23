import { getMatrixClient, useCryptoStore } from '@matrix-web/matrix-client'
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceVerificationSetup } from '../../crypto/device-verification-setup'
import { ManualVerification } from '../../crypto/manual-verification'
import { Button } from '../../ui/button'

function CryptoStatusRow({ label, enabled }: { label: string, enabled: boolean }) {
  const Icon = enabled ? ShieldCheck : ShieldX
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs">
        <Icon className={`h-3.5 w-3.5 ${enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
        {enabled ? 'On' : 'Off'}
      </span>
    </div>
  )
}

interface SecretStorageKeyInfo {
  keyId?: string
  content?: {
    passphrase?: {
      algorithm: string
      salt: string
      iterations: number
      bits: number
    }
  }
}

function useSecretStorageKeyInfo(): SecretStorageKeyInfo {
  const [info, setInfo] = useState<SecretStorageKeyInfo>({})

  useEffect(() => {
    const client = getMatrixClient()
    if (!client)
      return

    const defaultKeyEvent = client.getAccountData('m.secret_storage.default_key')
    const keyId = defaultKeyEvent?.getContent()?.key as string | undefined
    if (!keyId)
      return

    const keyEvent = client.getAccountData(`m.secret_storage.key.${keyId}`)
    const content = keyEvent?.getContent() as SecretStorageKeyInfo['content']

    setInfo({ keyId, content })
  }, [])

  return info
}

function useCrossSigningActive(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const client = getMatrixClient()
    if (!client)
      return

    const masterEvent = client.getAccountData('m.cross_signing.master')
    setActive(!!masterEvent?.getContent())
  }, [])

  return active
}

function useDeviceVerified(): boolean | null {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    const client = getMatrixClient()
    if (!client)
      return

    const crypto = client.getCrypto()
    if (!crypto)
      return

    const userId = client.getUserId()
    const deviceId = client.getDeviceId()
    if (!userId || !deviceId)
      return

    crypto.getDeviceVerificationStatus(userId, deviceId).then((status) => {
      setVerified(status?.crossSigningVerified ?? false)
    }).catch(() => setVerified(null))
  }, [])

  return verified
}

export function EncryptionPanel() {
  const { t } = useTranslation()
  const isInitialized = useCryptoStore(s => s.isInitialized)
  const crossSigningReady = useCryptoStore(s => s.crossSigningReady)
  const keyBackupEnabled = useCryptoStore(s => s.keyBackupEnabled)
  const secretStorageReady = useCryptoStore(s => s.secretStorageReady)

  const crossSigningActive = useCrossSigningActive()
  const deviceVerified = useDeviceVerified()
  const ssssKeyInfo = useSecretStorageKeyInfo()

  const [setupDialog, setSetupDialog] = useState<{ open: boolean, mode: 'setup' | 'reset' }>({ open: false, mode: 'setup' })
  const [manualVerifyOpen, setManualVerifyOpen] = useState(false)

  // Determine the overall state
  const needsSetup = !crossSigningActive
  const needsVerification = crossSigningActive && deviceVerified === false

  const handleSetupClose = useCallback(() => {
    setSetupDialog(prev => ({ ...prev, open: false }))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('encryption.title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('encryption.description')}
        </p>
      </div>

      {/* E2EE status */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t('encryption.status_title')}</span>
        </div>

        <CryptoStatusRow label={t('encryption.crypto_module')} enabled={isInitialized} />
        <CryptoStatusRow label={t('encryption.cross_signing')} enabled={crossSigningReady} />
        <CryptoStatusRow label={t('encryption.key_backup')} enabled={keyBackupEnabled} />
        <CryptoStatusRow label={t('encryption.secret_storage')} enabled={secretStorageReady} />
      </div>

      {/* Setup / Verify / Reset section */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        {needsSetup && (
          <>
            <div>
              <h3 className="text-sm font-semibold">{t('verification_setup.section_title')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('verification_setup.section_not_setup')}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setSetupDialog({ open: true, mode: 'setup' })}
            >
              {t('verification_setup.enable_button')}
            </Button>
          </>
        )}

        {needsVerification && (
          <>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm font-semibold">{t('manual_verification.section_title')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('manual_verification.section_description')}
            </p>
            <Button
              size="sm"
              onClick={() => setManualVerifyOpen(true)}
            >
              {t('manual_verification.verify_button')}
            </Button>
          </>
        )}

        {!needsSetup && !needsVerification && (
          <>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <h3 className="text-sm font-semibold">{t('verification_setup.section_verified')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('verification_setup.section_verified_description')}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSetupDialog({ open: true, mode: 'reset' })}
            >
              {t('verification_setup.reset_button')}
            </Button>
          </>
        )}
      </div>

      <DeviceVerificationSetup
        open={setupDialog.open}
        onClose={handleSetupClose}
        mode={setupDialog.mode}
      />

      <ManualVerification
        open={manualVerifyOpen}
        onClose={() => setManualVerifyOpen(false)}
        secretStorageKeyId={ssssKeyInfo.keyId}
        secretStorageKeyContent={ssssKeyInfo.content}
      />
    </div>
  )
}
