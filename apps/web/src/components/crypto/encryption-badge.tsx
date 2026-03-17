import { Shield, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'

export type EncryptionStatus = 'encrypted' | 'verified' | 'unencrypted'

interface EncryptionBadgeProps {
  status: EncryptionStatus
  className?: string
}

export function EncryptionBadge({ status, className }: EncryptionBadgeProps) {
  const { t } = useTranslation()

  if (status === 'unencrypted')
    return null

  if (status === 'verified') {
    return (
      <ShieldCheck
        className={cn('size-3.5 shrink-0 text-green-500', className)}
        aria-label={t('encryption_badge.verified')}
      />
    )
  }

  return (
    <Shield
      className={cn('size-3.5 shrink-0 text-yellow-500', className)}
      aria-label={t('encryption_badge.unverified')}
    />
  )
}
