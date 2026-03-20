import type { UiaChallenge } from '@matrix-web/matrix-client'
import type { FormEvent } from 'react'
import {
  buildPasswordAuth,
  getRemainingStages,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

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
    <Dialog open onOpenChange={v => !v && onCancel()}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('uia.title')}</DialogTitle>
          <DialogDescription>{t('uia.description')}</DialogDescription>
        </DialogHeader>

        {currentStage === 'm.login.password' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="uia-password">{t('uia.password_label')}</Label>
              <Input
                id="uia-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder={t('uia.password_placeholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {(error || challenge.error) && (
              <Alert variant="destructive">
                <AlertDescription>{error || challenge.error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !password}>
                {isLoading ? t('uia.verifying') : t('uia.verify')}
              </Button>
            </DialogFooter>
          </form>
        )}

        {currentStage && currentStage !== 'm.login.password' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('uia.unsupported_stage', { stage: currentStage })}
            </p>
            <Button variant="outline" className="w-full" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
