import type { FormEvent } from 'react'
import { useAuthStore } from '@matrix-web/matrix-client'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useRequiredConfig } from '../../providers/use-config'
import { ServerSelector } from '../login/server-selector'

export function RegisterPage() {
  const config = useRequiredConfig()
  const { homeservers } = config

  const defaultServer = homeservers.servers.find(s => s.name === homeservers.default)
  const [serverUrl, setServerUrl] = useState(defaultServer?.url ?? homeservers.servers[0]!.url)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const navigate = useNavigate()
  const register = useAuthStore(s => s.register)
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }

    await register({ homeserverUrl: serverUrl, username, password })
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/', { replace: true })
    }
  }

  const displayError = validationError ?? error

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Matrix Web</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a new account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ServerSelector
            config={homeservers}
            value={serverUrl}
            onChange={setServerUrl}
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              placeholder="username"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          {displayError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?
          {' '}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
