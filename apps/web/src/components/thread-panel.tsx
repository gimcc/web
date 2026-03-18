import type { TimelineMessage } from '@matrix-web/matrix-client'
import {
  loadThreadTimeline,
  sendThreadMessage,
  useAuthStore,
  useThreadsStore,
} from '@matrix-web/matrix-client'
import { Send, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderMarkdown } from '../lib/markdown'
import { MessageBubble } from './message-bubble'

interface ThreadPanelProps {
  roomId: string
  threadRootId: string
  onClose: () => void
  onReaction: (eventId: string, emoji: string) => void
}

const EMPTY_TIMELINE: TimelineMessage[] = []

export function ThreadPanel({ roomId, threadRootId, onClose, onReaction }: ThreadPanelProps) {
  const { t } = useTranslation()
  const messages = useThreadsStore(s => s.threads.get(threadRootId) ?? EMPTY_TIMELINE)
  const mockMode = useAuthStore(s => s.mockMode)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mockMode) {
      loadThreadTimeline(roomId, threadRootId)
    }
  }, [roomId, threadRootId, mockMode])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed)
      return

    setIsSending(true)
    try {
      const htmlBody = renderMarkdown(trimmed)
      const hasFormatting = htmlBody !== `<p>${trimmed}</p>\n` && htmlBody !== `<p>${trimmed}</p>`
      await sendThreadMessage(roomId, threadRootId, trimmed, hasFormatting ? { formattedBody: htmlBody } : undefined)
      setText('')
    }
    finally {
      setIsSending(false)
    }
  }, [text, roomId, threadRootId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }, [handleSend])

  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{t('chat.thread')}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Thread messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.map(msg => (
          <MessageBubble
            key={msg.eventId}
            message={msg}
            onReaction={onReaction}
          />
        ))}
        {messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">{t('chat.thread_empty')}</p>
          </div>
        )}
      </div>

      {/* Thread input */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.thread_reply_placeholder')}
            rows={1}
            disabled={isSending}
            className="max-h-[100px] min-h-[36px] flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isSending || text.trim() === ''}
            className="shrink-0 rounded-md bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label={t('chat.send_message')}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
