import { useCryptoStore } from '@matrix-web/matrix-client'
import { Shield, ShieldCheck, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/button'
import { CrossSigningSetupDialog } from '../../crypto/cross-signing-setup-dialog'
import { KeyBackupSetup } from '../../crypto/key-backup-setup'
import { SecretStorageSetupDialog } from '../../crypto/secret-storage-setup-dialog'

function CryptoStatusRow({ label, enabled }: { label: string, enabled: boolean }) {
  const { t } = useTranslation()
  const Icon = enabled ? ShieldCheck : ShieldX
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs">
        <Icon className={`h-3.5 w-3.5 ${enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
        {enabled ? t('common.enabled') : t('common.disabled')}
      </span>
    </div>
  )
}

export function EncryptionPanel() {
  const { t } = useTranslation()
  const isInitialized = useCryptoStore(s => s.isInitialized)
  const crossSigningReady = useCryptoStore(s => s.crossSigningReady)
  const keyBackupEnabled = useCryptoStore(s => s.keyBackupEnabled)
  const secretStorageReady = useCryptoStore(s => s.secretStorageReady)
  const [crossSigningDialog, setCrossSigningDialog] = useState<{ open: boolean, mode: 'setup' | 'reset' }>({ open: false, mode: 'setup' })
  const [secretStorageDialog, setSecretStorageDialog] = useState<{ open: boolean, mode: 'setup' | 'reset' }>({ open: false, mode: 'setup' })

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

      {/* Cross-signing setup */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">{t('cross_signing.title')}</h3>
          <p className="text-xs text-muted-foreground">
            {crossSigningReady
              ? t('cross_signing.enabled_message')
              : t('cross_signing.disabled_message')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!crossSigningReady && (
            <Button
              size="sm"
              onClick={() => setCrossSigningDialog({ open: true, mode: 'setup' })}
            >
              {t('cross_signing.setup_button')}
            </Button>
          )}
          {crossSigningReady && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCrossSigningDialog({ open: true, mode: 'reset' })}
            >
              {t('cross_signing.reset_button')}
            </Button>
          )}
        </div>
      </div>

      {/* Secret storage setup */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">{t('secret_storage.title')}</h3>
          <p className="text-xs text-muted-foreground">
            {secretStorageReady
              ? t('secret_storage.enabled_message')
              : t('secret_storage.disabled_message')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!secretStorageReady && (
            <Button
              size="sm"
              onClick={() => setSecretStorageDialog({ open: true, mode: 'setup' })}
            >
              {t('secret_storage.setup_button')}
            </Button>
          )}
          {secretStorageReady && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSecretStorageDialog({ open: true, mode: 'reset' })}
            >
              {t('secret_storage.reset_button')}
            </Button>
          )}
        </div>
      </div>

      {/* Key backup setup */}
      <KeyBackupSetup />

      <CrossSigningSetupDialog
        open={crossSigningDialog.open}
        onClose={() => setCrossSigningDialog(prev => ({ ...prev, open: false }))}
        mode={crossSigningDialog.mode}
      />

      <SecretStorageSetupDialog
        open={secretStorageDialog.open}
        onClose={() => setSecretStorageDialog(prev => ({ ...prev, open: false }))}
        mode={secretStorageDialog.mode}
      />
    </div>
  )
}
