import type { FormEvent } from 'react'
import {
  getIgnoredUsers,
  getMatrixClient,
  ignoreUser,
  unignoreUser,
} from '@matrix-web/matrix-client'
import { Ban, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'

export function IgnoredUsersSettings() {
  const { t } = useTranslation()
  const [ignoredUsers, setIgnoredUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [userId, setUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmUnignore, setConfirmUnignore] = useState<string | null>(null)

  const setSuccessWithAutoClear = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const loadIgnoredUsers = useCallback(() => {
    const client = getMatrixClient()
    if (!client)
      return
    const users = getIgnoredUsers(client)
    setIgnoredUsers(users)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadIgnoredUsers()
  }, [loadIgnoredUsers])

  const handleIgnore = async (e: FormEvent) => {
    e.preventDefault()
    const client = getMatrixClient()
    if (!client || !userId.trim())
      return

    const trimmed = userId.trim()
    if (!trimmed.startsWith('@') || !trimmed.includes(':')) {
      setError(t('ignored_users.error_invalid_id'))
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await ignoreUser(client, trimmed)
      setSuccessWithAutoClear(t('ignored_users.success_ignored', { userId: trimmed }))
      setUserId('')
      setShowAddForm(false)
      loadIgnoredUsers()
    }
    catch {
      setError(t('ignored_users.error_ignore'))
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleUnignore = async (uid: string) => {
    const client = getMatrixClient()
    if (!client)
      return

    setError(null)
    setConfirmUnignore(null)
    try {
      await unignoreUser(client, uid)
      setSuccessWithAutoClear(t('ignored_users.success_unignored', { userId: uid }))
      loadIgnoredUsers()
    }
    catch {
      setError(t('ignored_users.error_unignore'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Ban className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{t('ignored_users.title')}</h3>
      </div>

      <p className="text-xs text-muted-foreground">{t('ignored_users.description')}</p>

      {success && (
        <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading
        ? (
            <p className="text-xs text-muted-foreground">{t('app.loading')}</p>
          )
        : ignoredUsers.length === 0
          ? (
              <p className="text-xs text-muted-foreground">{t('ignored_users.empty')}</p>
            )
          : (
              <div className="space-y-2">
                {ignoredUsers.map(uid => (
                  <div key={uid} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="text-sm text-foreground truncate">{uid}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmUnignore(uid)}
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

      {!showAddForm
        ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSuccess(null)
                setError(null)
                setShowAddForm(true)
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('ignored_users.add')}
            </Button>
          )
        : (
            <form onSubmit={handleIgnore} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="ignore-user-id">
                  {t('ignored_users.user_id_label')}
                </label>
                <Input
                  id="ignore-user-id"
                  autoFocus
                  placeholder={t('ignored_users.user_id_placeholder')}
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setUserId('')
                    setError(null)
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting || !userId.trim()}>
                  {isSubmitting ? t('ignored_users.ignoring') : t('ignored_users.ignore')}
                </Button>
              </div>
            </form>
          )}

      {/* Confirm unignore dialog */}
      <Dialog open={confirmUnignore !== null} onOpenChange={(open) => { if (!open) setConfirmUnignore(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('ignored_users.confirm_unignore_title')}</DialogTitle>
            <DialogDescription>
              {t('ignored_users.confirm_unignore_message', { userId: confirmUnignore })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnignore(null)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={() => confirmUnignore && handleUnignore(confirmUnignore)}
            >
              {t('ignored_users.unignore')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
