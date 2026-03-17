import { useTranslation } from 'react-i18next'
import { DuressPasswordSettings } from '../duress-password-settings'
import { PasswordSettings } from '../password-settings'

export function SecurityPanel() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('security.title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('security.description')}
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
