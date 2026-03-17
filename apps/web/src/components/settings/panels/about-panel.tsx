import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const APP_VERSION = __APP_VERSION__

export function AboutPanel() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('about.title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('about.description')}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t('app.name')}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('about.version')}</span>
          <span className="text-xs font-medium text-foreground">{APP_VERSION}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('about.protocol')}</span>
          <span className="text-xs font-medium text-foreground">{t('about.protocol_value')}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('about.framework')}</span>
          <span className="text-xs font-medium text-foreground">{t('about.framework_value')}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">
          {t('about.long_description')}
        </p>
      </div>
    </div>
  )
}
