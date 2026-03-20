import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui/button'

export function PwaUpdatePrompt() {
  const { t } = useTranslation()

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        // Check for updates every hour
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      }
    },
  })

  const handleUpdate = useCallback(() => {
    void updateServiceWorker(true)
  }, [updateServiceWorker])

  if (!needRefresh)
    return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg">
      <p className="text-sm text-foreground">{t('pwa.update_available')}</p>
      <Button size="sm" onClick={handleUpdate}>
        {t('pwa.reload')}
      </Button>
    </div>
  )
}
