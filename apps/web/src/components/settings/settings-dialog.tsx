import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent showCloseButton className="h-[min(90vh,640px)] w-[min(95vw,768px)] max-w-none overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
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
          <TabsContent value="appearance" className="m-0 overflow-y-auto p-6"><AppearancePanel /></TabsContent>
          <TabsContent value="about" className="m-0 overflow-y-auto p-6"><AboutPanel /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
