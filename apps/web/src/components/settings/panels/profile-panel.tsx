import {
  getMatrixClient,
  getMyProfile,
  mxcToThumbnailUrl,
  removeAvatar,
  setDisplayName,
  uploadAvatar,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../ui/avatar'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'

export function ProfilePanel() {
  const { t } = useTranslation()
  const session = useAuthStore(s => s.session)
  const [displayName, setDisplayNameState] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [avatarMxc, setAvatarMxc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const client = getMatrixClient()
    if (!client) return

    getMyProfile(client)
      .then((profile) => {
        setDisplayNameState(profile.displayName ?? '')
        setOriginalName(profile.displayName ?? '')
        setAvatarUrl(profile.avatarUrl ?? undefined)
        setAvatarMxc(profile.avatarMxc)
      })
      .catch(() => {
        setError(t('profile.error_load'))
      })
      .finally(() => setLoading(false))
  }, [t])

  const handleSaveName = useCallback(async () => {
    const client = getMatrixClient()
    if (!client || displayName === originalName) return

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await setDisplayName(client, displayName.trim())
      setOriginalName(displayName.trim())
      setSuccess(t('profile.success_name'))
    }
    catch {
      setError(t('profile.error_name'))
    }
    finally {
      setSaving(false)
    }
  }, [displayName, originalName, t])

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const client = getMatrixClient()
    if (!client) return

    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const mxcUrl = await uploadAvatar(client, file)
      setAvatarMxc(mxcUrl)
      const httpUrl = mxcToThumbnailUrl(mxcUrl, session?.homeserverUrl ?? '', 96, 96, 'crop')
      setAvatarUrl(httpUrl)
      setSuccess(t('profile.success_avatar'))
    }
    catch {
      setError(t('profile.error_avatar'))
    }
    finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [session?.homeserverUrl, t])

  const handleRemoveAvatar = useCallback(async () => {
    const client = getMatrixClient()
    if (!client) return

    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      await removeAvatar(client)
      setAvatarUrl(undefined)
      setAvatarMxc(null)
      setSuccess(t('profile.success_avatar_removed'))
    }
    catch {
      setError(t('profile.error_avatar'))
    }
    finally {
      setUploading(false)
    }
  }, [t])

  const nameChanged = displayName.trim() !== originalName

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('profile.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('profile.description')}</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 rounded-lg border border-border p-4">
        <div className="relative">
          <Avatar
            name={displayName || session?.userId || '?'}
            src={avatarUrl}
            size="lg"
            className="h-16 w-16 text-lg"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {t('profile.change_avatar')}
          </Button>
          {avatarMxc && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t('profile.remove_avatar')}
            </Button>
          )}
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-2 rounded-lg border border-border p-4">
        <Label htmlFor="display-name" className="text-xs text-muted-foreground">
          {t('profile.display_name')}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="display-name"
            value={displayName}
            onChange={e => setDisplayNameState(e.target.value)}
            placeholder={session?.userId ?? ''}
            className="h-9"
          />
          <Button
            size="sm"
            onClick={handleSaveName}
            disabled={saving || !nameChanged || !displayName.trim()}
          >
            {saving
              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              : null}
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* User ID (read-only) */}
      <div className="space-y-2 rounded-lg border border-border p-4">
        <span className="text-xs text-muted-foreground">{t('account.user_id')}</span>
        <p className="text-sm font-medium text-foreground">{session?.userId}</p>
      </div>

      {/* Feedback */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
      )}
    </div>
  )
}
