import type { FormEvent } from 'react'
import {
  changePassword,
  removePassword,
  setPassword as setDekPassword,
  useLockStore,
} from '@matrix-web/matrix-client'
import { Lock, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type FormMode = 'idle' | 'set' | 'change' | 'remove'

export function PasswordSettings({ lockIdleTimeout }: { lockIdleTimeout: number }) {
  const hasPassword = useLockStore(s => s.hasPassword)
  const dek = useLockStore(s => s.dek)
  const lock = useLockStore(s => s.lock)
  const setHasPassword = useLockStore(s => s.setHasPassword)

  const [mode, setMode] = useState<FormMode>('idle')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = () => {
    setMode('idle')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
  }

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (!dek) {
      setError('DEK not available. Please try again later.')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await setDekPassword(dek, newPassword)
      setHasPassword(true)
      setSuccess('Password has been set successfully')
      resetForm()
    }
    catch {
      setError('Failed to set password')
    }
    finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess('Password has been changed successfully')
      resetForm()
    }
    catch {
      setError('Current password is incorrect')
    }
    finally {
      setIsLoading(false)
    }
  }

  const handleRemovePassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await removePassword(currentPassword)
      setHasPassword(false)
      setSuccess('Password has been removed')
      resetForm()
    }
    catch {
      setError('Password is incorrect')
    }
    finally {
      setIsLoading(false)
    }
  }

  const formatTimeout = (seconds: number) => {
    if (seconds < 60)
      return `${seconds} seconds`
    const minutes = Math.floor(seconds / 60)
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Lock Screen Password</h3>
      </div>

      {success && (
        <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {hasPassword && (
        <p className="text-xs text-muted-foreground">
          Auto-lock after
          {' '}
          {formatTimeout(lockIdleTimeout)}
          {' '}
          of inactivity
        </p>
      )}

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          {!hasPassword
            ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSuccess(null)
                    setMode('set')
                  }}
                >
                  Set Password
                </Button>
              )
            : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSuccess(null)
                      setMode('change')
                    }}
                  >
                    Change Password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSuccess(null)
                      setMode('remove')
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove Password
                  </Button>
                  <Button variant="outline" size="sm" onClick={lock}>
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Lock Now
                  </Button>
                </>
              )}
        </div>
      )}

      {mode === 'set' && (
        <form onSubmit={handleSetPassword} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="new-pw">
              New Password
            </label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="confirm-pw">
              Confirm Password
            </label>
            <Input
              id="confirm-pw"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isLoading || !newPassword || !confirmPassword}>
              {isLoading ? 'Setting...' : 'Set Password'}
            </Button>
          </div>
        </form>
      )}

      {mode === 'change' && (
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="current-pw">
              Current Password
            </label>
            <Input
              id="current-pw"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="new-pw-change">
              New Password
            </label>
            <Input
              id="new-pw-change"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="confirm-pw-change">
              Confirm New Password
            </label>
            <Input
              id="confirm-pw-change"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}>
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      )}

      {mode === 'remove' && (
        <form onSubmit={handleRemovePassword} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="remove-pw">
              Current Password
            </label>
            <Input
              id="remove-pw"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
            <Button type="submit" variant="destructive" size="sm" disabled={isLoading || !currentPassword}>
              {isLoading ? 'Removing...' : 'Remove Password'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
