import { useAuthStore, useConnectionStore } from '@matrix-web/matrix-client'
import { Menu, Plus, Settings, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { NewChatDialog } from './compose/new-chat-dialog'
import { ContactsDialog } from './contacts/contacts-dialog'
import { InviteBell, InviteDialog } from './invite-panel'
import { RoomList } from './room-list'
import { SettingsDialog } from './settings/settings-dialog'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

function ConnectionIndicator() {
  const { t } = useTranslation()
  const status = useConnectionStore(s => s.status)

  const statusConfig = {
    syncing: { color: 'bg-green-500', label: t('connection.connected') },
    connecting: { color: 'bg-yellow-500', label: t('connection.connecting_ellipsis') },
    reconnecting: { color: 'bg-yellow-500', label: t('connection.reconnecting_ellipsis') },
    error: { color: 'bg-red-500', label: t('connection.error') },
    disconnected: { color: 'bg-gray-500', label: t('connection.disconnected') },
  }

  const { color, label } = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { t } = useTranslation()
  const session = useAuthStore(s => s.session)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onToggle}
          aria-label={t('sidebar.close')}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">{t('app.name')}</h1>
          <div className="flex items-center gap-1">
            <InviteBell onClick={() => setInviteOpen(true)} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setNewChatOpen(true)}
                  aria-label={t('sidebar.new_chat')}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.new_chat')}</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggle}
              className="md:hidden"
              aria-label={t('sidebar.close')}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-hidden">
          <RoomList />
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {session?.userId ?? t('common.unknown')}
              </p>
              <ConnectionIndicator />
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setContactsOpen(true)}
                    aria-label={t('sidebar.contacts')}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('sidebar.contacts')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSettingsOpen(true)}
                    aria-label={t('sidebar.settings')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('sidebar.settings')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>

      {/* Dialogs */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ContactsDialog open={contactsOpen} onClose={() => setContactsOpen(false)} />
      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} />
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  )
}

export function SidebarToggle({ onToggle }: { onToggle: () => void }) {
  const { t } = useTranslation()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      className="md:hidden"
      aria-label={t('sidebar.open')}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
