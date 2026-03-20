import type { LucideIcon } from 'lucide-react'
import { Bell, BellRing, Code2, Info, Lock, Palette, Shield, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeveloperMode } from '../../hooks/use-developer-mode'
import { cn } from '../../lib/utils'
import { Dialog, DialogContent } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'
import { AboutPanel } from './panels/about-panel'
import { AccountPanel } from './panels/account-panel'
import { AppearancePanel } from './panels/appearance-panel'
import { DevToolsPanel } from './panels/dev-tools-panel'
import { EncryptionPanel } from './panels/encryption-panel'
import { NotificationsPanel } from './panels/notifications-panel'
import { ProfilePanel } from './panels/profile-panel'
import { PushRulesPanel } from './panels/push-rules-panel'
import { SecurityPanel } from './panels/security-panel'

type SettingsTab = 'profile' | 'account' | 'security' | 'encryption' | 'notifications' | 'push_rules' | 'appearance' | 'dev_tools' | 'about'

interface TabItem {
  id: SettingsTab
  label: string
  icon: LucideIcon
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

const PANELS: Record<string, React.ComponentType> = {
  profile: ProfilePanel,
  account: AccountPanel,
  security: SecurityPanel,
  encryption: EncryptionPanel,
  notifications: NotificationsPanel,
  push_rules: PushRulesPanel,
  appearance: AppearancePanel,
  dev_tools: DevToolsPanel,
  about: AboutPanel,
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [devMode] = useDeveloperMode()

  const tabs = useMemo(() => {
    const items: TabItem[] = [
      { id: 'profile', label: t('settings.tab.profile'), icon: User },
      { id: 'account', label: t('settings.tab.account'), icon: User },
      { id: 'security', label: t('settings.tab.security'), icon: Lock },
      { id: 'encryption', label: t('settings.tab.encryption'), icon: Shield },
      { id: 'notifications', label: t('settings.tab.notifications'), icon: Bell },
      { id: 'push_rules', label: t('push_rules.title'), icon: BellRing },
      { id: 'appearance', label: t('settings.tab.appearance'), icon: Palette },
    ]
    if (devMode)
      items.push({ id: 'dev_tools', label: t('dev_tools.title'), icon: Code2 })
    items.push({ id: 'about', label: t('settings.tab.about'), icon: Info })
    return items
  }, [t, devMode])

  const ActivePanel = PANELS[activeTab] as React.ComponentType

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="flex h-[70vh] max-h-[600px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw] md:max-w-3xl" showCloseButton={false}>
        <div className="flex h-full min-h-0">
          {/* Sidebar */}
          <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
            </div>
            <ScrollArea className="flex-1">
              <nav className="flex flex-col gap-0.5 px-2 pb-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </ScrollArea>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              <ActivePanel />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
