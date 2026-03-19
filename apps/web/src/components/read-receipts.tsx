import type { ReceiptInfo } from '@matrix-web/matrix-client'
import { useTranslation } from 'react-i18next'

interface ReadReceiptsProps {
  receipts: ReceiptInfo[]
  /** Max avatars to show before "+N" */
  maxDisplay?: number
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
]

function getColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return COLORS[Math.abs(hash) % COLORS.length]!
}

export function ReadReceipts({ receipts, maxDisplay = 5 }: ReadReceiptsProps) {
  const { t } = useTranslation()

  if (receipts.length === 0)
    return null

  const displayed = receipts.slice(0, maxDisplay)
  const remaining = receipts.length - displayed.length

  const tooltipText = receipts.length <= 3
    ? t('message.read_by_list', { names: receipts.map(r => r.userName).join(', ') })
    : t('message.read_by_count', { count: receipts.length })

  return (
    <div className="flex items-center -space-x-1 pt-0.5" title={tooltipText}>
      {displayed.map(receipt => (
        <div
          key={receipt.userId}
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-medium text-white ring-1 ring-background ${getColor(receipt.userId)}`}
          title={receipt.userName}
        >
          {receipt.userName.charAt(0).toUpperCase()}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex h-4 items-center justify-center rounded-full bg-muted px-1 text-[8px] font-medium text-muted-foreground ring-1 ring-background">
          +
          {remaining}
        </div>
      )}
    </div>
  )
}
