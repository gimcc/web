import { DuressPasswordSettings } from '../duress-password-settings'
import { PasswordSettings } from '../password-settings'

export function SecurityPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Security</h3>
        <p className="text-xs text-muted-foreground">
          Configure lock screen password and duress protection.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <PasswordSettings />
      </div>

      <div className="rounded-lg border border-border p-4">
        <DuressPasswordSettings />
      </div>
    </div>
  )
}
