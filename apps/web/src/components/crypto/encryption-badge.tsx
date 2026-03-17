import { Shield, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/utils'

export type EncryptionStatus = 'encrypted' | 'verified' | 'unencrypted'

interface EncryptionBadgeProps {
  status: EncryptionStatus
  className?: string
}

export function EncryptionBadge({ status, className }: EncryptionBadgeProps) {
  if (status === 'unencrypted')
    return null

  if (status === 'verified') {
    return (
      <ShieldCheck
        className={cn('size-3.5 shrink-0 text-green-500', className)}
        aria-label="Encrypted and verified"
      />
    )
  }

  return (
    <Shield
      className={cn('size-3.5 shrink-0 text-yellow-500', className)}
      aria-label="Encrypted but unverified"
    />
  )
}
