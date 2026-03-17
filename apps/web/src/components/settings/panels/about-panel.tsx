import { Info } from 'lucide-react'

const APP_VERSION = __APP_VERSION__

export function AboutPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">About</h3>
        <p className="text-xs text-muted-foreground">
          Application information.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Matrix Web</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Version</span>
          <span className="text-xs font-medium text-foreground">{APP_VERSION}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Protocol</span>
          <span className="text-xs font-medium text-foreground">Matrix</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Framework</span>
          <span className="text-xs font-medium text-foreground">React 19</span>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">
          Matrix Web is a browser-based chat client built on the Matrix protocol.
          It supports end-to-end encryption, local data protection, and real-time messaging.
        </p>
      </div>
    </div>
  )
}
