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
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type Mode = 'idle' | 'set' | 'change'

export function DuressPasswordSettings() {
  const { t } = useTranslation()
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
          {t('duress.title')}
        </div>
        <p className="text-sm text-muted-foreground">
          {t('duress.disabled_message')}
        </p>
      </div>
    )
  }

  const handleSet = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (duressInput.length === 0) {
      setError(t('duress.error_empty'))
      return
    }

    if (duressInput !== confirmInput) {
      setError(t('duress.error_mismatch'))
      return
    }

    setIsSubmitting(true)
    try {
      await setDuressPassword(duressInput)
      setDuressExists(true)
      setSuccess(t('duress.success_configured'))
      resetForm()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('duress.error_set_failed'))
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
      setError(t('duress.error_new_empty'))
      return
    }

    if (duressInput !== confirmInput) {
      setError(t('duress.error_mismatch'))
      return
    }

    setIsSubmitting(true)
    try {
      await changeDuressPassword(duressInput)
      setSuccess(t('duress.success_updated'))
      resetForm()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('duress.error_change_failed'))
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = () => {
    removeDuressPassword()
    setDuressExists(false)
    setSuccess(t('duress.success_removed'))
    resetForm()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldAlert className="h-4 w-4" />
        {t('duress.title')}
      </div>

      {/* Warning banner */}
      <div className="flex gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          {t('duress.warning')}
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
                  <span className="text-sm text-muted-foreground">{t('duress.status_set')}</span>
                  <Button variant="outline" size="sm" onClick={() => setMode('change')}>
                    {t('common.change')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleRemove}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    {t('common.remove')}
                  </Button>
                </>
              )
            : (
                <>
                  <span className="text-sm text-muted-foreground">{t('duress.status_not_set')}</span>
                  <Button variant="outline" size="sm" onClick={() => setMode('set')}>
                    {t('duress.set')}
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
              {mode === 'set' ? t('duress.label_set') : t('duress.label_change')}
            </label>
            <Input
              id="duress-pw"
              type="password"
              autoComplete="new-password"
              value={duressInput}
              onChange={e => setDuressInput(e.target.value)}
              placeholder={t('duress.placeholder')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="duress-pw-confirm" className="text-sm text-foreground">
              {t('duress.confirm_label')}
            </label>
            <Input
              id="duress-pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder={t('duress.confirm_placeholder')}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? t('duress.saving') : mode === 'set' ? t('common.set') : t('common.change')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
