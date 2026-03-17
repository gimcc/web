import { useAuthStore, useConnectionStore } from '@matrix-web/matrix-client'
import { LogOut } from 'lucide-react'
import { Button } from '../../ui/button'

function ConnectionStatusBadge() {
  const status = useConnectionStore(s => s.status)

  const statusConfig = {
    syncing: { color: 'bg-green-500', label: 'Connected' },
    connecting: { color: 'bg-yellow-500', label: 'Connecting' },
    reconnecting: { color: 'bg-yellow-500', label: 'Reconnecting' },
    error: { color: 'bg-red-500', label: 'Error' },
    disconnected: { color: 'bg-gray-500', label: 'Disconnected' },
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
  const session = useAuthStore(s => s.session)
  const logout = useAuthStore(s => s.logout)
  const mockMode = useAuthStore(s => s.mockMode)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Account</h3>
        <p className="text-xs text-muted-foreground">
          Manage your account and connection.
        </p>
      </div>

      {/* User info */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">User ID</span>
          <span className="text-sm font-medium text-foreground">
            {session?.userId ?? 'Unknown'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Homeserver</span>
          <span className="text-sm font-medium text-foreground">
            {session?.homeserverUrl ?? 'Unknown'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status</span>
          <ConnectionStatusBadge />
        </div>

        {mockMode && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Mode</span>
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
              Mock
            </span>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Sign Out</p>
            <p className="text-xs text-muted-foreground">
              Sign out of your account on this device.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
