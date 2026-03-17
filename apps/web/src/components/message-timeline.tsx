import type { TimelineMessage } from '@matrix-web/matrix-client'
import {
  loadInitialTimeline,
  loadMockTimeline,
  loadRoomHistory,
  resendMessage,
  useAuthStore,
  useMessagesStore,
} from '@matrix-web/matrix-client'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MessageBubble } from './message-bubble'

const EMPTY_TIMELINE: TimelineMessage[] = []

interface MessageTimelineProps {
  roomId: string
}

export function MessageTimeline({ roomId }: MessageTimelineProps) {
  const messages = useMessagesStore(s => s.timelines.get(roomId) ?? EMPTY_TIMELINE)
  const hasMore = useMessagesStore(s => s.hasMore.get(roomId) ?? false)
  const mockMode = useAuthStore(s => s.mockMode)

  const parentRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const prevMessageCountRef = useRef(0)
  const isAtBottomRef = useRef(true)

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

    // Load more history when scrolling near top
    if (el.scrollTop < 200 && hasMore && !isLoadingHistory && !mockMode) {
      setIsLoadingHistory(true)
      loadRoomHistory(roomId).finally(() => setIsLoadingHistory(false))
    }
  }, [hasMore, isLoadingHistory, mockMode, roomId, messages.length])

  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
  }, [virtualizer, messages.length])

  const handleResend = useCallback((eventId: string) => {
    void resendMessage(roomId, eventId)
  }, [roomId])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
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
              <span className="text-xs text-muted-foreground">Loading history...</span>
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
                  onResend={handleResend}
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
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5 text-foreground" />
        </button>
      )}
    </div>
  )
}
