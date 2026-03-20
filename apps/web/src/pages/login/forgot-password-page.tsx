import type { FormEvent } from 'react'
import {
  generateClientSecret,
  requestPasswordResetEmail,
  submitNewPassword,
} from '@matrix-web/matrix-client'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useRequiredConfig } from '../../providers/use-config'
import { ServerSelector } from './server-selector'

type Step = 'email' | 'verify' | 'new-password' | 'done'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const config = useRequiredConfig()
  const { homeservers } = config

  const defaultServer = homeservers.servers.find(s => s.name === homeservers.default)
  const [serverUrl, setServerUrl] = useState(defaultServer?.url ?? homeservers.servers[0]!.url)
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clientSecretRef = useRef(generateClientSecret())
  const sidRef = useRef('')
  const sendAttemptRef = useRef(1)

  const handleRequestEmail = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await requestPasswordResetEmail(
        serverUrl,
        email,
        clientSecretRef.current,
        sendAttemptRef.current,
      )
      sidRef.current = result.sid
      sendAttemptRef.current++
      setStep('verify')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('forgot_password.error_send'))
    }
    finally {
      setIsLoading(false)
    }
  }

  const handleSetNewPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError(t('password.error_mismatch'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('password.error_too_short'))
      return
    }

    setIsLoading(true)

    try {
      await submitNewPassword(
        serverUrl,
        newPassword,
        sidRef.current,
        clientSecretRef.current,
      )
      setStep('done')
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t('forgot_password.error_reset'))
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('forgot_password.title')}</p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleRequestEmail} className="space-y-4">
            <ServerSelector config={homeservers} value={serverUrl} onChange={setServerUrl} />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                {t('forgot_password.email_label')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t('forgot_password.email_placeholder')}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !serverUrl || !email}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? t('forgot_password.sending') : t('forgot_password.send_email')}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('forgot_password.check_email', { email })}
            </p>

            <button
              type="button"
              onClick={() => setStep('new-password')}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('forgot_password.email_confirmed')}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError(null)
              }}
              className="w-full rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {t('forgot_password.resend_email')}
            </button>
          </div>
        )}

        {step === 'new-password' && (
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-password">
                {t('forgot_password.new_password')}
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="confirm-new-password">
                {t('forgot_password.confirm_new_password')}
              </label>
              <input
                id="confirm-new-password"
                type="password"
                required
                autoComplete="new-password"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? t('forgot_password.resetting') : t('forgot_password.reset_password')}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('forgot_password.success')}
            </p>
            <Link
              to="/login"
              className="inline-block w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('forgot_password.back_to_login')}
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              {t('forgot_password.back_to_login')}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
