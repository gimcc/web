import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeveloperMode } from '../../hooks/use-developer-mode'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AboutPanel } from './panels/about-panel'
import { AccountPanel } from './panels/account-panel'
import { AppearancePanel } from './panels/appearance-panel'
import { DevToolsPanel } from './panels/dev-tools-panel'
import { EncryptionPanel } from './panels/encryption-panel'
import { NotificationsPanel } from './panels/notifications-panel'
import { PushRulesPanel } from './panels/push-rules-panel'
import { SecurityPanel } from './panels/security-panel'

type SettingsTab = 'account' | 'security' | 'encryption' | 'notifications' | 'push_rules' | 'appearance' | 'dev_tools' | 'about'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [devMode] = useDeveloperMode()

  const TABS = useMemo(() => {
    const tabs: { id: SettingsTab, label: string }[] = [
      { id: 'account', label: t('settings.tab.account') },
      { id: 'security', label: t('settings.tab.security') },
      { id: 'encryption', label: t('settings.tab.encryption') },
      { id: 'notifications', label: t('settings.tab.notifications') },
      { id: 'push_rules', label: t('push_rules.title') },
      { id: 'appearance', label: t('settings.tab.appearance') },
    ]
    if (devMode)
      tabs.push({ id: 'dev_tools', label: t('dev_tools.title') })
    tabs.push({ id: 'about', label: t('settings.tab.about') })
    return tabs
  }, [t, devMode])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="sm:max-w-[90vw] md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as SettingsTab)}
          orientation="vertical"
          className="flex min-h-0 flex-1 gap-0"
        >
          <TabsList variant="line" className="h-auto w-40 shrink-0 flex-col justify-start rounded-none border-r border-border bg-muted/30 p-0 py-2">
            {TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="w-full justify-start rounded-none px-4 py-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="account" className="m-0 overflow-y-auto p-6"><AccountPanel /></TabsContent>
          <TabsContent value="security" className="m-0 overflow-y-auto p-6"><SecurityPanel /></TabsContent>
          <TabsContent value="encryption" className="m-0 overflow-y-auto p-6"><EncryptionPanel /></TabsContent>
          <TabsContent value="notifications" className="m-0 overflow-y-auto p-6"><NotificationsPanel /></TabsContent>
          <TabsContent value="push_rules" className="m-0 overflow-y-auto p-6"><PushRulesPanel /></TabsContent>
          <TabsContent value="appearance" className="m-0 overflow-y-auto p-6"><AppearancePanel /></TabsContent>
          {devMode && <TabsContent value="dev_tools" className="m-0 overflow-y-auto p-6"><DevToolsPanel /></TabsContent>}
          <TabsContent value="about" className="m-0 overflow-y-auto p-6"><AboutPanel /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
