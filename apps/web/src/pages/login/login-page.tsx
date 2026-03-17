import type { FormEvent } from 'react'
import { useAuthStore } from '@matrix-web/matrix-client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useRequiredConfig } from '../../providers/use-config'
import { ServerSelector } from './server-selector'

export function LoginPage() {
  const { t } = useTranslation()
  const config = useRequiredConfig()
  const { homeservers } = config

  const defaultServer = homeservers.servers.find(s => s.name === homeservers.default)
  const [serverUrl, setServerUrl] = useState(defaultServer?.url ?? homeservers.servers[0]!.url)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await login({ homeserverUrl: serverUrl, username, password })
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('auth.sign_in_title')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ServerSelector
            config={homeservers}
            value={serverUrl}
            onChange={setServerUrl}
          />

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
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              {t('auth.password')}
            </label>
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
