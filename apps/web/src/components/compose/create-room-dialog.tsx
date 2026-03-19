import {
  createRoom,
  getMatrixClient,
  useAuthStore,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { Globe, Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface CreateRoomDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateRoomDialog({ open, onClose }: CreateRoomDialogProps) {
  const { t } = useTranslation()
  const mockMode = useAuthStore(s => s.mockMode)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)

  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open)
      return
    setName('')
    setTopic('')
    setIsPublic(false)
    setError(null)
  }, [open])

  const handleCreate = useCallback(async () => {
    if (!name.trim())
      return

    setIsCreating(true)
    setError(null)

    try {
      if (mockMode) {
        onClose()
        return
      }

      const client = getMatrixClient()
      if (!client)
        return

      const roomId = await createRoom(client, {
        name: name.trim(),
        topic: topic.trim() || undefined,
        isPublic,
      })

      setActiveRoom(roomId)
      onClose()
    }
    catch {
      setError(t('room.error_create'))
    }
    finally {
      setIsCreating(false)
    }
  }, [name, topic, isPublic, mockMode, setActiveRoom, onClose, t])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v)
          onClose()
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('room.create_title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1">{t('room.name_label')}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('room.name_placeholder')} autoFocus />
          </div>

          <div>
            <Label className="mb-1">{t('room.topic_label')}</Label>
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder={t('room.topic_placeholder')} />
          </div>

          <div>
            <Label className="mb-1">{t('room.visibility')}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  !isPublic ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Lock className="h-4 w-4" />
                {t('room.private')}
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  isPublic ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Globe className="h-4 w-4" />
                {t('room.public')}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()} className="w-full">
            {isCreating ? t('new_chat.creating') : t('room.create_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
