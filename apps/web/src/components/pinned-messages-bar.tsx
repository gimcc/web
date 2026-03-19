import type { TimelineMessage } from '@matrix-web/matrix-client'
import { getPinnedMessages, unpinMessage } from '@matrix-web/matrix-client'
import { Pin, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PinnedMessagesBarProps {
  roomId: string
  /** Incremented when pinned messages change to trigger refresh */
  refreshKey?: number
}

export function PinnedMessagesBar({ roomId, refreshKey }: PinnedMessagesBarProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())

  // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey triggers re-computation
  const allPinned = useMemo(() => getPinnedMessages(roomId), [roomId, refreshKey])

  const pinned = useMemo(
    () => allPinned.filter(m => !removedIds.has(m.eventId)),
    [allPinned, removedIds],
  )

  const handleUnpin = useCallback(async (eventId: string) => {
    try {
      await unpinMessage(roomId, eventId)
      setRemovedIds(prev => new Set([...prev, eventId]))
    }
    catch { /* ignore */ }
  }, [roomId])

  if (pinned.length === 0)
    return null

  return (
    <div className="border-b border-border bg-accent/30 px-4 py-1.5">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <Pin className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">
          {t('message.pinned_count', { count: pinned.length })}
        </span>
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1">
          {pinned.map((msg: TimelineMessage) => (
            <div key={msg.eventId} className="flex items-start gap-2 rounded bg-background/50 px-2 py-1">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-primary">{msg.senderName}</span>
                <p className="truncate text-xs text-muted-foreground">{msg.body}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleUnpin(msg.eventId)
                }}
                aria-label={t('message.unpin')}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
