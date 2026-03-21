import { getMatrixClient, MatrixError } from '@matrix-web/matrix-client'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'

interface PendingUiaRequest {
  makeRequest: (authDict: Record<string, unknown>) => Promise<void>
  resolve: () => void
  reject: (err: unknown) => void
}

/**
 * Hook that provides a reusable UIA (User-Interactive Authentication) callback
 * for cross-signing bootstrap and other Matrix operations requiring auth.
 *
 * Returns:
 * - `authUploadDeviceSigningKeys`: callback to pass to `bootstrapCrossSigning`
 * - `UiaDialog`: component to render in the parent for the password prompt
 */
export function useUiaAuth() {
  const { t } = useTranslation()
  const [showDialog, setShowDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef<PendingUiaRequest | null>(null)

  const authUploadDeviceSigningKeys = useCallback(
    async (makeRequest: (authDict: Record<string, unknown>) => Promise<void>) => {
      // First attempt with empty auth dict to let the server decide
      try {
        await makeRequest({})
        return
      } catch (err) {
        if (!(err instanceof MatrixError) || err.httpStatus !== 401) {
          throw err
        }
        const authData = err.data as { session?: string }
        if (!authData.session) {
          throw err
        }

        // Server requires UIA — show password prompt and wait
        return new Promise<void>((resolve, reject) => {
          pendingRef.current = {
            makeRequest: makeRequest as (authDict: Record<string, unknown>) => Promise<void>,
            resolve,
            reject,
          }
          setSession(authData.session ?? null)
          setError(null)
          setPassword('')
          setShowDialog(true)
        })
      }
    },
    [],
  )

  const handleSubmit = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending || !session) return

    const client = getMatrixClient()
    const userId = client?.getUserId()
    if (!userId) return

    try {
      await pending.makeRequest({
        type: 'm.login.password',
        identifier: {
          type: 'm.id.user',
          user: userId,
        },
        password,
        session,
      })
      pending.resolve()
    } catch (err) {
      pending.reject(err)
      setError(err instanceof Error ? err.message : t('uia_auth.error'))
    } finally {
      pendingRef.current = null
      setSession(null)
      setPassword('')
      setShowDialog(false)
    }
  }, [session, password, t])

  const handleCancel = useCallback(() => {
    const pending = pendingRef.current
    if (pending) {
      pending.reject(new Error('Cancelled'))
    }
    pendingRef.current = null
    setSession(null)
    setPassword('')
    setError(null)
    setShowDialog(false)
  }, [])

  function UiaDialog() {
    if (!showDialog) return null
    return (
      <Dialog open onOpenChange={v => !v && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('uia_auth.title')}</DialogTitle>
            <DialogDescription>{t('uia_auth.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('uia_auth.password_placeholder')}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!password.trim()}>
              {t('uia_auth.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return { authUploadDeviceSigningKeys, UiaDialog, cancelUia: handleCancel }
}
