import type { FormEvent } from 'react'
import {
  changePassword,
  removePassword,
  setPassword as setDekPassword,
  useLockStore,
} from '@matrix-web/matrix-client'
import { Lock, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type FormMode = 'idle' | 'set' | 'change' | 'remove'

const TIMEOUT_OPTIONS = [
  { value: 300, labelKey: 'password.timeout_5m' },
  { value: 1800, labelKey: 'password.timeout_30m' },
  { value: 3600, labelKey: 'password.timeout_1h' },
  { value: 14400, labelKey: 'password.timeout_4h' },
] as const

export function PasswordSettings() {
  const { t } = useTranslation()
  const hasPassword = useLockStore(s => s.hasPassword)
  const dek = useLockStore(s => s.dek)
  const lock = useLockStore(s => s.lock)
  const setHasPassword = useLockStore(s => s.setHasPassword)
  const idleTimeout = useLockStore(s => s.idleTimeout)
  const setIdleTimeout = useLockStore(s => s.setIdleTimeout)

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
      setError(t('password.error_mismatch'))
      return
    }
    if (newPassword.length < 6) {
      setError(t('password.error_too_short'))
      return
    }
    if (!dek) {
      setError(t('password.error_dek_unavailable'))
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await setDekPassword(dek, newPassword)
      setHasPassword(true)
      setSuccess(t('password.success_set'))
      resetForm()
    }
    catch {
      setError(t('password.error_set_failed'))
    }
    finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError(t('password.error_mismatch'))
      return
    }
    if (newPassword.length < 6) {
      setError(t('password.error_too_short'))
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(t('password.success_changed'))
      resetForm()
    }
    catch {
      setError(t('password.error_current_incorrect'))
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
      setSuccess(t('password.success_removed'))
      resetForm()
    }
    catch {
      setError(t('password.error_incorrect'))
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{t('password.title')}</h3>
      </div>

      {success && (
        <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {hasPassword && (
        <div className="flex items-center gap-2">
          <label htmlFor="idle-timeout" className="text-xs text-muted-foreground whitespace-nowrap">
            {t('password.timeout_label')}
          </label>
          <select
            id="idle-timeout"
            value={idleTimeout}
            onChange={e => setIdleTimeout(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
          >
            {TIMEOUT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>
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
                  {t('password.set')}
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
                    {t('password.change')}
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
                    {t('password.remove')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={lock}>
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    {t('password.lock_now')}
                  </Button>
                </>
              )}
        </div>
      )}

      {mode === 'set' && (
        <form onSubmit={handleSetPassword} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="new-pw">
              {t('password.new_password')}
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
              {t('password.confirm_password')}
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
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={isLoading || !newPassword || !confirmPassword}>
              {isLoading ? t('password.setting') : t('password.set')}
            </Button>
          </div>
        </form>
      )}

      {mode === 'change' && (
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="current-pw">
              {t('password.current_password')}
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
              {t('password.new_password')}
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
              {t('password.confirm_new_password')}
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
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}>
              {isLoading ? t('password.changing') : t('password.change')}
            </Button>
          </div>
        </form>
      )}

      {mode === 'remove' && (
        <form onSubmit={handleRemovePassword} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="remove-pw">
              {t('password.current_password')}
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
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button type="submit" variant="destructive" size="sm" disabled={isLoading || !currentPassword}>
              {isLoading ? t('password.removing') : t('password.remove')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
