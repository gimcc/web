import type { FormEvent } from 'react'
import type { UiaChallenge } from '@matrix-web/matrix-client'
import {
  buildPasswordAuth,
  getRemainingStages,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface UiaDialogProps {
  challenge: UiaChallenge
  onSubmit: (auth: Record<string, unknown>) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

export function UiaDialog({ challenge, onSubmit, onCancel, isLoading, error }: UiaDialogProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const session = useAuthStore(s => s.session)

  const remaining = getRemainingStages(challenge)
  const currentStage = remaining[0]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (currentStage === 'm.login.password' && session) {
      const auth = buildPasswordAuth(challenge.session, session.userId, password)
      onSubmit(auth as unknown as Record<string, unknown>)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">{t('uia.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('uia.description')}</p>

        {currentStage === 'm.login.password' && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="uia-password">
                {t('uia.password_label')}
              </label>
              <input
                id="uia-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder={t('uia.password_placeholder')}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {(error || challenge.error) && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error || challenge.error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading || !password}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? t('uia.verifying') : t('uia.verify')}
              </button>
            </div>
          </form>
        )}

        {currentStage && currentStage !== 'm.login.password' && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              {t('uia.unsupported_stage', { stage: currentStage })}
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 w-full rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
