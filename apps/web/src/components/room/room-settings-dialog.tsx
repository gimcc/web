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
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
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
  }, [open, room, roomId])

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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="p-0 sm:max-w-[440px]" showCloseButton={false}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <DialogTitle className="text-base">{t('room.settings_title')}</DialogTitle>
          <DialogClose className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'general' | 'permissions')}>
          <TabsList variant="line" className="h-auto w-full rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="general" className="gap-1.5 rounded-none">
              <Settings className="h-4 w-4" />
              {t('permission.tab_general')}
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 rounded-none">
              <Shield className="h-4 w-4" />
              {t('permission.tab_permissions')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'general' && (
          <>
            <div className="space-y-4 px-4 py-4">
              <div>
                <Label className="mb-1">{t('room.name_label')}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label className="mb-1">{t('room.topic_label')}</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} disabled={!canEdit} placeholder={t('room.topic_placeholder')} />
              </div>
              <div>
                <Label className="mb-1 text-muted-foreground">{t('room.room_id')}</Label>
                <p className="font-mono text-sm text-foreground">{roomId}</p>
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
            </div>

            {canEdit && (
              <div className="border-t border-border px-4 py-3">
                <Button onClick={handleSave} disabled={isSaving || !name.trim()} className="w-full">
                  {isSaving ? `${t('common.save')}...` : t('common.save')}
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
      </DialogContent>
    </Dialog>
  )
}
