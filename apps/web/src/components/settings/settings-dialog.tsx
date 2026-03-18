import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { AboutPanel } from './panels/about-panel'
import { AccountPanel } from './panels/account-panel'
import { AppearancePanel } from './panels/appearance-panel'
import { EncryptionPanel } from './panels/encryption-panel'
import { NotificationsPanel } from './panels/notifications-panel'
import { SecurityPanel } from './panels/security-panel'

type SettingsTab = 'account' | 'security' | 'encryption' | 'notifications' | 'appearance' | 'about'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  const TABS: { id: SettingsTab, label: string }[] = [
    { id: 'account', label: t('settings.tab.account') },
    { id: 'security', label: t('settings.tab.security') },
    { id: 'encryption', label: t('settings.tab.encryption') },
    { id: 'notifications', label: t('settings.tab.notifications') },
    { id: 'appearance', label: t('settings.tab.appearance') },
    { id: 'about', label: t('settings.tab.about') },
  ]

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (!open)
      return

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open)
    return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={t('settings.close')}
      />

      {/* Dialog */}
      <div role="dialog" aria-modal="true" aria-label={t('settings.title')} className="relative z-10 flex h-[min(90vh,640px)] w-[min(95vw,768px)] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{t('settings.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: tabs + content */}
        <div className="flex min-h-0 flex-1">
          {/* Tab navigation (sidebar style) */}
          <nav className="w-40 shrink-0 border-r border-border bg-muted/30 py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'account' && <AccountPanel />}
            {activeTab === 'security' && <SecurityPanel />}
            {activeTab === 'encryption' && <EncryptionPanel />}
            {activeTab === 'notifications' && <NotificationsPanel />}
            {activeTab === 'appearance' && <AppearancePanel />}
            {activeTab === 'about' && <AboutPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
