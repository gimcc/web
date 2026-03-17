import { useCryptoStore } from '@matrix-web/matrix-client'
import { Shield, ShieldCheck, ShieldX } from 'lucide-react'
import { KeyBackupSetup } from '../../crypto/key-backup-setup'

function CryptoStatusRow({ label, enabled }: { label: string, enabled: boolean }) {
  const Icon = enabled ? ShieldCheck : ShieldX
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs">
        <Icon className={`h-3.5 w-3.5 ${enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}

export function EncryptionPanel() {
  const isInitialized = useCryptoStore(s => s.isInitialized)
  const crossSigningReady = useCryptoStore(s => s.crossSigningReady)
  const keyBackupEnabled = useCryptoStore(s => s.keyBackupEnabled)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Encryption</h3>
        <p className="text-xs text-muted-foreground">
          End-to-end encryption status and key management.
        </p>
      </div>

      {/* E2EE status */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">E2EE Status</span>
        </div>

        <CryptoStatusRow label="Crypto Module" enabled={isInitialized} />
        <CryptoStatusRow label="Cross-Signing" enabled={crossSigningReady} />
        <CryptoStatusRow label="Key Backup" enabled={keyBackupEnabled} />
      </div>

      {/* Key backup setup */}
      <KeyBackupSetup />
    </div>
  )
}
