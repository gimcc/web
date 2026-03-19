import type { ReceiptInfo, TimelineMessage } from '@matrix-web/matrix-client'
import {
  deleteMessage,
  getPinnedEventIds,
  loadInitialTimeline,
  loadMockTimeline,
  loadRoomHistory,
  pinMessage,
  resendMessage,
  sendReadReceipt,
  toggleMockReaction,
  toggleReaction,
  unpinMessage,
  useAuthStore,
  useMessagesStore,
  useReceiptsStore,
} from '@matrix-web/matrix-client'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageBubble } from './message-bubble'

const EMPTY_TIMELINE: TimelineMessage[] = []
const EMPTY_RECEIPTS = new Map<string, ReceiptInfo[]>()

interface MessageTimelineProps {
  roomId: string
  onEditMessage?: (message: TimelineMessage) => void
  onReplyMessage?: (message: TimelineMessage) => void
  onThread?: (eventId: string) => void
  onPinChange?: () => void
}

export function MessageTimeline({ roomId, onEditMessage, onReplyMessage, onThread, onPinChange }: MessageTimelineProps) {
  const { t } = useTranslation()
  // Subscribe to the Map reference directly so any appendMessages/setTimeline
  // update (which creates a new Map) reliably triggers a re-render.
  const timelines = useMessagesStore(s => s.timelines)
  const hasMoreMap = useMessagesStore(s => s.hasMore)
  const messages = timelines.get(roomId) ?? EMPTY_TIMELINE
  const hasMore = hasMoreMap.get(roomId) ?? false
  const mockMode = useAuthStore(s => s.mockMode)
  const roomReceipts = useReceiptsStore(s => s.receipts.get(roomId))
  const receiptsByEvent = useMemo(() => {
    if (!roomReceipts)
      return EMPTY_RECEIPTS
    const byEvent = new Map<string, ReceiptInfo[]>()
    for (const info of roomReceipts.values()) {
      const list = byEvent.get(info.eventId) ?? []
      list.push(info)
      byEvent.set(info.eventId, list)
    }
    return byEvent
  }, [roomReceipts])
  const lastSentReceiptRef = useRef<string | null>(null)

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() =>
    mockMode ? new Set() : new Set(getPinnedEventIds(roomId)),
  )

  const parentRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const prevMessageCountRef = useRef(0)
  const isAtBottomRef = useRef(true)

  // Reload pinned IDs on room change
  const prevRoomRef = useRef(roomId)
  if (prevRoomRef.current !== roomId) {
    prevRoomRef.current = roomId
    setPinnedIds(mockMode ? new Set() : new Set(getPinnedEventIds(roomId)))
  }

  // Load initial timeline for this room
  useEffect(() => {
    if (mockMode) {
      loadMockTimeline(roomId)
    }
    else {
      loadInitialTimeline(roomId)
    }
  }, [roomId, mockMode])

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  // Auto-scroll to bottom when new messages arrive (if user is near bottom)
  useLayoutEffect(() => {
    if (messages.length > prevMessageCountRef.current && isAtBottomRef.current) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, virtualizer])

  // Send read receipt when at bottom and new messages arrive
  useEffect(() => {
    if (mockMode || messages.length === 0 || !isAtBottomRef.current)
      return
    const lastMessage = messages.at(-1)!
    if (lastMessage.eventId.startsWith('~') || lastMessage.eventId === lastSentReceiptRef.current)
      return
    lastSentReceiptRef.current = lastMessage.eventId
    void sendReadReceipt(roomId, lastMessage.eventId)
  }, [messages, roomId, mockMode])

  // Scroll to bottom on first load
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
    }
  // Only on mount / room change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // Track scroll position for auto-scroll and show/hide button
  const handleScroll = useCallback(() => {
    const el = parentRef.current
    if (!el)
      return

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isNearBottom = distanceFromBottom < 100
    isAtBottomRef.current = isNearBottom
    setShowScrollButton(!isNearBottom && messages.length > 0)

    // Send read receipt when scrolling to bottom
    if (isNearBottom && !mockMode && messages.length > 0) {
      const lastMessage = messages.at(-1)!
      if (!lastMessage.eventId.startsWith('~') && lastMessage.eventId !== lastSentReceiptRef.current) {
        lastSentReceiptRef.current = lastMessage.eventId
        void sendReadReceipt(roomId, lastMessage.eventId)
      }
    }

    // Load more history when scrolling near top
    if (el.scrollTop < 200 && hasMore && !isLoadingHistory && !mockMode) {
      setIsLoadingHistory(true)
      loadRoomHistory(roomId).finally(() => setIsLoadingHistory(false))
    }
  }, [hasMore, isLoadingHistory, mockMode, roomId, messages])

  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
  }, [virtualizer, messages.length])

  const handleResend = useCallback((eventId: string) => {
    void resendMessage(roomId, eventId)
  }, [roomId])

  const handleReaction = useCallback((eventId: string, emoji: string) => {
    if (mockMode) {
      toggleMockReaction(roomId, eventId, emoji)
    }
    else {
      void toggleReaction(roomId, eventId, emoji)
    }
  }, [roomId, mockMode])

  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const handleDelete = useCallback((message: TimelineMessage) => {
    if (mockMode)
      return
    if (pendingDelete === message.eventId) {
      // Second click confirms
      void deleteMessage(roomId, message.eventId)
      setPendingDelete(null)
    }
    else {
      // First click sets pending
      setPendingDelete(message.eventId)
      // Auto-clear after 3 seconds
      setTimeout(setPendingDelete, 3000, null)
    }
  }, [roomId, mockMode, pendingDelete])

  const handlePin = useCallback(async (eventId: string) => {
    if (mockMode)
      return
    try {
      if (pinnedIds.has(eventId)) {
        await unpinMessage(roomId, eventId)
        setPinnedIds(prev => new Set([...prev].filter(id => id !== eventId)))
      }
      else {
        await pinMessage(roomId, eventId)
        setPinnedIds(prev => new Set([...prev, eventId]))
      }
      onPinChange?.()
    }
    catch { /* ignore */ }
  }, [roomId, mockMode, pinnedIds, onPinChange])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('chat.empty_timeline')}</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={parentRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
      >
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {isLoadingHistory && (
            <div className="flex justify-center py-2">
              <span className="text-xs text-muted-foreground">{t('chat.loading_history')}</span>
            </div>
          )}

          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index]!
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                <MessageBubble
                  message={message}
                  receipts={receiptsByEvent.get(message.eventId)}
                  isPinned={pinnedIds.has(message.eventId)}
                  onResend={handleResend}
                  onReaction={handleReaction}
                  onEdit={onEditMessage}
                  onDelete={handleDelete}
                  onReply={onReplyMessage}
                  onPin={mockMode ? undefined : handlePin}
                  onThread={onThread}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          type="button"
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-lg transition-colors hover:bg-accent"
          onClick={scrollToBottom}
          aria-label={t('chat.scroll_to_bottom')}
        >
          <ArrowDown className="h-5 w-5 text-foreground" />
        </button>
      )}
    </div>
  )
}
