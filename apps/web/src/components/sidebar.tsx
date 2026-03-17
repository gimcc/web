import { useAuthStore, useConnectionStore } from '@matrix-web/matrix-client'
import { LogOut, Menu, Plus, Settings, Users, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import { NewChatDialog } from './compose/new-chat-dialog'
import { ContactsDialog } from './contacts/contacts-dialog'
import { RoomList } from './room-list'
import { SettingsDialog } from './settings/settings-dialog'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

function ConnectionIndicator() {
  const status = useConnectionStore(s => s.status)

  const statusConfig = {
    syncing: { color: 'bg-green-500', label: 'Connected' },
    connecting: { color: 'bg-yellow-500', label: 'Connecting...' },
    reconnecting: { color: 'bg-yellow-500', label: 'Reconnecting...' },
    error: { color: 'bg-red-500', label: 'Error' },
    disconnected: { color: 'bg-gray-500', label: 'Disconnected' },
  } as const

  const { color, label } = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const session = useAuthStore(s => s.session)
  const logout = useAuthStore(s => s.logout)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onToggle}
          aria-label="Close sidebar"
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
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">Matrix Web</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="New chat"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-hidden">
          <RoomList />
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {session?.userId ?? 'Unknown'}
              </p>
              <ConnectionIndicator />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setContactsOpen(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Contacts"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Dialogs */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ContactsDialog open={contactsOpen} onClose={() => setContactsOpen(false)} />
      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </>
  )
}

export function SidebarToggle({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
      aria-label="Open sidebar"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
