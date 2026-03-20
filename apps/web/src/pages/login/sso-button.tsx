import type { SsoIdentityProvider } from '@matrix-web/matrix-client'
import { startSsoLogin } from '@matrix-web/matrix-client'
import { useTranslation } from 'react-i18next'

interface SsoButtonProps {
  homeserverUrl: string
  provider?: SsoIdentityProvider
}

function getSsoCallbackUrl(): string {
  return `${window.location.origin}${window.location.pathname}?sso=1`
}

export function SsoButton({ homeserverUrl, provider }: SsoButtonProps) {
  const { t } = useTranslation()

  const handleClick = () => {
    startSsoLogin(homeserverUrl, getSsoCallbackUrl(), provider?.id)
  }

  const label = provider
    ? t('sso.sign_in_with', { provider: provider.name })
    : t('sso.sign_in_sso')

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      {provider?.icon && (
        <img
          src={provider.icon}
          alt=""
          className="h-4 w-4"
          aria-hidden="true"
        />
      )}
      {label}
    </button>
  )
}

interface SsoProvidersProps {
  homeserverUrl: string
  providers: SsoIdentityProvider[]
}

export function SsoProviders({ homeserverUrl, providers }: SsoProvidersProps) {
  const { t } = useTranslation()

  if (providers.length === 0) {
    return (
      <SsoButton homeserverUrl={homeserverUrl} />
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-muted-foreground">{t('sso.or_sign_in_with')}</p>
      {providers.map(provider => (
        <SsoButton
          key={provider.id}
          homeserverUrl={homeserverUrl}
          provider={provider}
        />
      ))}
    </div>
  )
}
