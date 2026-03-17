import type { FormEvent } from 'react'
import {
  changeDuressPassword,
  hasDuressPassword,
  removeDuressPassword,
  setDuressPassword,
  useLockStore,
} from '@matrix-web/matrix-client'
import { AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type Mode = 'idle' | 'set' | 'change'

export function DuressPasswordSettings() {
  const hasPassword = useLockStore(s => s.hasPassword)
  const [duressExists, setDuressExists] = useState(() => hasDuressPassword())
  const [mode, setMode] = useState<Mode>('idle')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [duressInput, setDuressInput] = useState('')
  const [confirmInput, setConfirmInput] = useState('')

  const resetForm = useCallback(() => {
    setDuressInput('')
    setConfirmInput('')
    setError(null)
    setSuccess(null)
    setMode('idle')
  }, [])

  if (!hasPassword) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldAlert className="h-4 w-4" />
          Duress Password
        </div>
        <p className="text-sm text-muted-foreground">
          Set a lock screen password first to enable the duress password feature.
        </p>
      </div>
    )
  }

  const handleSet = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (duressInput.length === 0) {
      setError('Duress password cannot be empty')
      return
    }

    if (duressInput !== confirmInput) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      await setDuressPassword(duressInput)
      setDuressExists(true)
      setSuccess('Duress password configured')
      resetForm()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set duress password')
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (duressInput.length === 0) {
      setError('New duress password cannot be empty')
      return
    }

    if (duressInput !== confirmInput) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      await changeDuressPassword(duressInput)
      setSuccess('Duress password updated')
      resetForm()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change duress password')
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = () => {
    removeDuressPassword()
    setDuressExists(false)
    setSuccess('Duress password removed')
    resetForm()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldAlert className="h-4 w-4" />
        Duress Password
      </div>

      {/* Warning banner */}
      <div className="flex gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          The duress password is for emergency use only. When entered on the lock screen,
          it silently wipes all local data and shows a session expiry message. This action
          is irreversible.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Idle state */}
      {mode === 'idle' && (
        <div className="flex items-center gap-2">
          {duressExists
            ? (
                <>
                  <span className="text-sm text-muted-foreground">Duress password is set.</span>
                  <Button variant="outline" size="sm" onClick={() => setMode('change')}>
                    Change
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleRemove}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                </>
              )
            : (
                <>
                  <span className="text-sm text-muted-foreground">No duress password configured.</span>
                  <Button variant="outline" size="sm" onClick={() => setMode('set')}>
                    Set duress password
                  </Button>
                </>
              )}
        </div>
      )}

      {/* Set / Change form */}
      {(mode === 'set' || mode === 'change') && (
        <form onSubmit={mode === 'set' ? handleSet : handleChange} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="duress-pw" className="text-sm text-foreground">
              {mode === 'set' ? 'Duress password' : 'New duress password'}
            </label>
            <Input
              id="duress-pw"
              type="password"
              autoComplete="new-password"
              value={duressInput}
              onChange={e => setDuressInput(e.target.value)}
              placeholder="Enter duress password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="duress-pw-confirm" className="text-sm text-foreground">
              Confirm duress password
            </label>
            <Input
              id="duress-pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="Confirm duress password"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'set' ? 'Set' : 'Change'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
