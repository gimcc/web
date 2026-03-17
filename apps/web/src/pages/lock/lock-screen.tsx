import type { FormEvent } from 'react'
import {
  clearAllLocalData,
  loadDekWithPassword,
  silentWipe,
  useLockStore,
  verifyPasswordInput,
} from '@matrix-web/matrix-client'
import { Lock, LogOut } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

const MAX_ATTEMPTS = 3
const DURESS_ANIMATION_MS = 2_000

export function LockScreen() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotConfirm, setShowForgotConfirm] = useState(false)
  const [isWiping, setIsWiping] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const attemptCountRef = useRef(0)

  const unlock = useLockStore(s => s.unlock)

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!password.trim())
      return

    setError(null)
    setIsLoading(true)

    try {
      const result = await verifyPasswordInput(password)

      if (result.type === 'normal') {
        // Normal password — load DEK and unlock
        const dek = await loadDekWithPassword(password)
        attemptCountRef.current = 0
        unlock(dek)
        return
      }

      if (result.type === 'duress') {
        // Duress password — fake unlock animation, then silent wipe
        setIsWiping(true)
        await new Promise(resolve => setTimeout(resolve, DURESS_ANIMATION_MS))
        await silentWipe()
        setIsWiping(false)
        setSessionExpired(true)
        return
      }

      // Invalid password — wipe after MAX_ATTEMPTS
      attemptCountRef.current += 1
      if (attemptCountRef.current >= MAX_ATTEMPTS) {
        await clearAllLocalData()
        window.location.href = '/'
        return
      }

      const remaining = MAX_ATTEMPTS - attemptCountRef.current
      setError(`Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before data wipe.`)
    }
    catch {
      attemptCountRef.current += 1
      if (attemptCountRef.current >= MAX_ATTEMPTS) {
        await clearAllLocalData()
        window.location.href = '/'
        return
      }
      const remaining = MAX_ATTEMPTS - attemptCountRef.current
      setError(`Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before data wipe.`)
    }
    finally {
      setIsLoading(false)
    }
  }, [password, unlock])

  const handleForgotPassword = async () => {
    await clearAllLocalData()
    window.location.href = '/'
  }

  // Session expired after duress wipe
  if (sessionExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <LogOut className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Session Expired</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your session has expired. Please sign in again.
              </p>
            </div>
          </div>
          <Button
            onClick={() => { window.location.href = '/' }}
            className="w-full"
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  // Fake unlock animation during duress wipe
  if (isWiping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Unlocking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Locked</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your password to unlock
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="lock-password">
              Password
            </label>
            <Input
              id="lock-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="Enter your lock screen password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full"
          >
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </Button>
        </form>

        <div className="text-center">
          {showForgotConfirm
            ? (
                <div className="space-y-3 rounded-md border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">
                    This will erase all local data and you will need to sign in again. This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowForgotConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={handleForgotPassword}
                    >
                      <LogOut className="mr-1.5 h-3.5 w-3.5" />
                      Erase & Sign Out
                    </Button>
                  </div>
                </div>
              )
            : (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setShowForgotConfirm(true)}
                >
                  Forgot password?
                </button>
              )}
        </div>
      </div>
    </div>
  )
}
