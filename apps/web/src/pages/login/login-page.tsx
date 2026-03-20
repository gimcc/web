import type { FormEvent } from 'react'
import type { LoginFlowsResult, SsoIdentityProvider } from '@matrix-web/matrix-client'
import {
  discoverHomeserver,
  getLoginFlows,
  isDomainInput,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useRequiredConfig } from '../../providers/use-config'
import { ServerSelector } from './server-selector'
import { SsoProviders } from './sso-button'

export function LoginPage() {
  const { t } = useTranslation()
  const config = useRequiredConfig()
  const { homeservers } = config

  const defaultServer = homeservers.servers.find(s => s.name === homeservers.default)
  const [serverUrl, setServerUrl] = useState(defaultServer?.url ?? homeservers.servers[0]!.url)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginFlows, setLoginFlows] = useState<LoginFlowsResult | null>(null)
  const [isDiscovering, setIsDiscovering] = useState(false)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useAuthStore(s => s.login)
  const loginWithToken = useAuthStore(s => s.loginWithToken)
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)

  // Handle SSO callback with loginToken
  useEffect(() => {
    const loginToken = searchParams.get('loginToken')
    const hsUrl = searchParams.get('homeserver') || serverUrl
    if (!loginToken || !hsUrl) return

    // Clear sensitive token from URL immediately
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('loginToken')
    window.history.replaceState(null, '', cleanUrl.toString())

    loginWithToken(hsUrl, loginToken).then(() => {
      if (useAuthStore.getState().isAuthenticated) {
        navigate('/', { replace: true })
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run only on mount to avoid re-execution with stale token
  }, [])

  // Fetch login flows when server URL changes
  const fetchFlows = useCallback(async (url: string) => {
    if (!url) {
      setLoginFlows(null)
      return
    }
    try {
      const flows = await getLoginFlows(url)
      setLoginFlows(flows)
    }
    catch {
      setLoginFlows(null)
    }
  }, [])

  useEffect(() => {
    if (serverUrl) {
      fetchFlows(serverUrl)
    }
  }, [serverUrl, fetchFlows])

  // Handle server URL changes with well-known discovery
  const handleServerChange = async (value: string) => {
    setServerUrl(value)

    if (isDomainInput(value)) {
      setIsDiscovering(true)
      try {
        const result = await discoverHomeserver(value)
        if (result) {
          setServerUrl(result.homeserverUrl)
        }
      }
      finally {
        setIsDiscovering(false)
      }
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await login({ homeserverUrl: serverUrl, username, password })
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/', { replace: true })
    }
  }

  const showPasswordLogin = !loginFlows || loginFlows.supportsPassword
  const showSso = loginFlows?.supportsSso ?? false
  const ssoProviders: SsoIdentityProvider[] = loginFlows?.ssoProviders ?? []

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('auth.sign_in_title')}</p>
        </div>

        <ServerSelector
          config={homeservers}
          value={serverUrl}
          onChange={handleServerChange}
        />

        {isDiscovering && (
          <p className="text-center text-xs text-muted-foreground">{t('well_known.discovering')}</p>
        )}

        {showPasswordLogin && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="username">
                {t('auth.username')}
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                placeholder={t('auth.user_id_placeholder')}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  {t('auth.password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  {t('forgot_password.link')}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !serverUrl}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? t('auth.signing_in') : t('auth.sign_in')}
            </button>
          </form>
        )}

        {showSso && showPasswordLogin && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-input" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">{t('sso.divider')}</span>
            </div>
          </div>
        )}

        {showSso && (
          <SsoProviders homeserverUrl={serverUrl} providers={ssoProviders} />
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.no_account')}
          {' '}
          <Link to="/register" className="text-primary underline-offset-4 hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
