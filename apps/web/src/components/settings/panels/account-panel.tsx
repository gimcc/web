import { useAuthStore, useConnectionStore } from '@matrix-web/matrix-client'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/button'
import { ContactInfoSettings } from '../contact-info-settings'
import { DeviceManagement } from '../device-management'
import { IgnoredUsersSettings } from '../ignored-users-settings'

function ConnectionStatusBadge() {
  const { t } = useTranslation()
  const status = useConnectionStore(s => s.status)

  const statusConfig = {
    syncing: { color: 'bg-green-500', label: t('connection.connected') },
    connecting: { color: 'bg-yellow-500', label: t('connection.connecting') },
    reconnecting: { color: 'bg-yellow-500', label: t('connection.reconnecting') },
    error: { color: 'bg-red-500', label: t('connection.error') },
    disconnected: { color: 'bg-gray-500', label: t('connection.disconnected') },
  } as const

  const { color, label } = statusConfig[status]

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}

export function AccountPanel() {
  const { t } = useTranslation()
  const session = useAuthStore(s => s.session)
  const logout = useAuthStore(s => s.logout)
  const mockMode = useAuthStore(s => s.mockMode)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('account.title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('account.description')}
        </p>
      </div>

      {/* User info */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('account.user_id')}</span>
          <span className="text-sm font-medium text-foreground">
            {session?.userId ?? t('common.unknown')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('account.homeserver')}</span>
          <span className="text-sm font-medium text-foreground">
            {session?.homeserverUrl ?? t('common.unknown')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('account.status')}</span>
          <ConnectionStatusBadge />
        </div>

        {mockMode && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('account.mode')}</span>
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
              {t('account.mock')}
            </span>
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="rounded-lg border border-border p-4">
        <ContactInfoSettings />
      </div>

      {/* Device management */}
      <div className="rounded-lg border border-border p-4">
        <DeviceManagement />
      </div>

      {/* Ignored users */}
      <div className="rounded-lg border border-border p-4">
        <IgnoredUsersSettings />
      </div>

      {/* Logout */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t('auth.sign_out')}</p>
            <p className="text-xs text-muted-foreground">
              {t('auth.sign_out_description')}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            {t('auth.sign_out')}
          </Button>
        </div>
      </div>
    </div>
  )
}
