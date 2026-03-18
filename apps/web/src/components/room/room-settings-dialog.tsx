import {
  getMatrixClient,
  getMyPowerLevel,
  updateRoomName,
  updateRoomTopic,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { Settings, Shield, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { PermissionEditor } from './permission-editor'

interface RoomSettingsDialogProps {
  open: boolean
  roomId: string
  onClose: () => void
}

export function RoomSettingsDialog({ open, roomId, onClose }: RoomSettingsDialogProps) {
  const { t } = useTranslation()
  const room = useRoomsStore(s => s.rooms.get(roomId))

  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (!open || !room)
      return
    setName(room.name)
    setTopic(room.topic ?? '')
    setError(null)

    const client = getMatrixClient()
    if (client) {
      setCanEdit(getMyPowerLevel(client, roomId) >= 50)
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, room, roomId, onClose])

  const handleSave = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return

    setIsSaving(true)
    setError(null)

    try {
      if (name.trim() !== room?.name) {
        await updateRoomName(client, roomId, name.trim())
      }
      if (topic.trim() !== (room?.topic ?? '')) {
        await updateRoomTopic(client, roomId, topic.trim())
      }
      onClose()
    }
    catch {
      setError(t('room.error_settings'))
    }
    finally {
      setIsSaving(false)
    }
  }, [name, topic, room, roomId, onClose, t])

  if (!open)
    return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label={t('common.close')} />
      <div role="dialog" aria-modal="true" className="relative z-10 w-[min(95vw,440px)] rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t('room.settings_title')}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'general'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Settings className="h-4 w-4" />
            {t('permission.tab_general')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'permissions'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Shield className="h-4 w-4" />
            {t('permission.tab_permissions')}
          </button>
        </div>

        {activeTab === 'general' && (
          <>
            <div className="space-y-4 px-4 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t('room.name_label')}</label>
                <Input value={name} onChange={e => setName(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t('room.topic_label')}</label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} disabled={!canEdit} placeholder={t('room.topic_placeholder')} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t('room.room_id')}</label>
                <p className="text-sm font-mono text-foreground">{roomId}</p>
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
            </div>

            {canEdit && (
              <div className="border-t border-border px-4 py-3">
                <Button onClick={handleSave} disabled={isSaving || !name.trim()} className="w-full">
                  {isSaving ? t('common.save') + '...' : t('common.save')}
                </Button>
              </div>
            )}
          </>
        )}

        {activeTab === 'permissions' && (
          <div className="px-4 py-4">
            <PermissionEditor roomId={roomId} />
          </div>
        )}
      </div>
    </div>
  )
}
