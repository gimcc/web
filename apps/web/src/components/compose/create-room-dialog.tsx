import {
  createRoom,
  getMatrixClient,
  useAuthStore,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { Globe, Lock, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

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
  }, [open, onClose])

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

  if (!open)
    return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label={t('common.close')} />
      <div role="dialog" aria-modal="true" className="relative z-10 w-[min(95vw,440px)] rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t('room.create_title')}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('room.name_label')}</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('room.name_placeholder')} autoFocus />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('room.topic_label')}</label>
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder={t('room.topic_placeholder')} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t('room.visibility')}</label>
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

        <div className="border-t border-border px-4 py-3">
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()} className="w-full">
            {isCreating ? t('new_chat.creating') : t('room.create_button')}
          </Button>
        </div>
      </div>
    </div>
  )
}
