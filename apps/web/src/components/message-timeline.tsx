import type { ReceiptInfo, TimelineItem, TimelineMessageItem } from '@matrix-web/matrix-client'
import type { MessageLayout } from '../hooks/use-layout-preference'
import {
  deleteMessage,
  getPinnedEventIds,
  loadInitialTimeline,
  loadMockTimeline,
  loadRoomHistory,
  ReceiptType,
  resendMessage,
  resendUpload,
  sendReadReceipt,
  toggleMockReaction,
  toggleReaction,
  useAuthStore,
  useReceiptsStore,
} from '@matrix-web/matrix-client'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLayoutPreference } from '../hooks/use-layout-preference'
import { useRoomTimeline } from '../hooks/use-room-timeline'
import { useNotificationStore } from '../lib/notifications'
import { MessageBubble } from './message-bubble'
import { MessageCompact } from './message-compact'
import { MessageModern } from './message-modern'
import { ReportDialog } from './report-dialog'
import { DayDivider, UnreadDivider } from './timeline-divider'
import { MemberEventRow, StateEventRow } from './timeline-event-item'
import { Button } from './ui/button'

const EMPTY_RECEIPTS = new Map<string, ReceiptInfo[]>()

interface MessageTimelineProps {
  roomId: string
  onEditMessage?: (message: TimelineMessageItem) => void
  onReplyMessage?: (message: TimelineMessageItem) => void
  onThread?: (eventId: string) => void
  onPinChange?: () => void
  jumpToTimestamp?: number | null
  jumpToRequestId?: number | null
}

export function MessageTimeline({ roomId, onEditMessage, onReplyMessage, onThread, onPinChange, jumpToTimestamp, jumpToRequestId }: MessageTimelineProps) {
  const { t } = useTranslation()
  const mockMode = useAuthStore(s => s.mockMode)
  const { layout } = useLayoutPreference()
  const { items, hasMore } = useRoomTimeline(roomId)

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
  const prevItemCountRef = useRef(0)
  const isAtBottomRef = useRef(true)
  // Scroll anchoring: track the first visible item key before history load
  const anchorKeyRef = useRef<string | null>(null)

  // Reload pinned IDs and reset scroll state on room change
  const prevRoomRef = useRef(roomId)
  if (prevRoomRef.current !== roomId) {
    prevRoomRef.current = roomId
    prevItemCountRef.current = 0
    isAtBottomRef.current = true
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
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  // Auto-scroll: anchor to previous position after history load, or scroll to bottom for new messages
  useLayoutEffect(() => {
    if (items.length === 0)
      return

    // History prepend: restore scroll to the anchored item
    if (anchorKeyRef.current) {
      const anchorKey = anchorKeyRef.current
      anchorKeyRef.current = null
      const anchorIndex = items.findIndex(item => item.key === anchorKey)
      if (anchorIndex > 0) {
        virtualizer.scrollToIndex(anchorIndex, { align: 'start' })
        prevItemCountRef.current = items.length
        return
      }
    }

    // New messages at bottom: auto-scroll if user is near bottom
    if (items.length > prevItemCountRef.current && isAtBottomRef.current) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
    }
    prevItemCountRef.current = items.length
  }, [items, virtualizer])

  // Send read receipt when at bottom and new messages arrive
  const privateReceipts = useNotificationStore(s => s.privateReadReceipts)
  const currentReceiptType = privateReceipts ? ReceiptType.ReadPrivate : ReceiptType.Read

  useEffect(() => {
    if (mockMode || items.length === 0 || !isAtBottomRef.current)
      return
    // Find the last message item for receipt
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]!
      if (item.kind === 'message' && !item.eventId.startsWith('~')) {
        if (item.eventId === lastSentReceiptRef.current)
          break
        lastSentReceiptRef.current = item.eventId
        void sendReadReceipt(roomId, item.eventId, currentReceiptType)
        break
      }
    }
  }, [items, roomId, mockMode, currentReceiptType])

  // Track scroll position for auto-scroll and show/hide button
  const handleScroll = useCallback(() => {
    const el = parentRef.current
    if (!el)
      return

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isNearBottom = distanceFromBottom < 100
    isAtBottomRef.current = isNearBottom
    setShowScrollButton(!isNearBottom && items.length > 0)

    // Send read receipt when scrolling to bottom
    if (isNearBottom && !mockMode && items.length > 0) {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]!
        if (item.kind === 'message' && !item.eventId.startsWith('~')) {
          if (item.eventId !== lastSentReceiptRef.current) {
            lastSentReceiptRef.current = item.eventId
            void sendReadReceipt(roomId, item.eventId, currentReceiptType)
          }
          break
        }
      }
    }

    // Load more history when scrolling near top
    if (el.scrollTop < 200 && hasMore && !isLoadingHistory && !mockMode) {
      // Save anchor: first visible item key for scroll restoration
      const firstVisible = virtualizer.getVirtualItems()[0]
      if (firstVisible && items[firstVisible.index]) {
        anchorKeyRef.current = items[firstVisible.index]!.key
      }
      setIsLoadingHistory(true)
      loadRoomHistory(roomId).finally(() => setIsLoadingHistory(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingHistory, mockMode, roomId, items])

  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
  }, [virtualizer, items.length])

  const handleResend = useCallback((eventId: string) => {
    if (eventId.startsWith('~upload-')) {
      void resendUpload(roomId, eventId)
    }
    else {
      void resendMessage(roomId, eventId)
    }
  }, [roomId])

  const handleReaction = useCallback((eventId: string, emoji: string) => {
    if (mockMode) {
      toggleMockReaction(roomId, eventId, emoji)
    }
    else {
      void toggleReaction(roomId, eventId, emoji)
    }
  }, [roomId, mockMode])

  // Jump-to-event: highlighted event for flash effect
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleJumpToEvent = useCallback((eventId: string) => {
    const index = items.findIndex(item => item.kind === 'message' && item.eventId === eventId)
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: 'center' })
      setHighlightedEventId(eventId)
      if (highlightTimerRef.current)
        clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(setHighlightedEventId, 1500, null)
    }
  }, [items, virtualizer])

  // Jump to date: find the first message at or after the target timestamp
  useEffect(() => {
    if (!jumpToTimestamp)
      return
    const targetIndex = items.findIndex(
      item => item.kind === 'message' && item.timestamp >= jumpToTimestamp,
    )
    if (targetIndex >= 0) {
      virtualizer.scrollToIndex(targetIndex, { align: 'center' })
      const targetItem = items[targetIndex]!
      if (targetItem.kind === 'message') {
        setHighlightedEventId(targetItem.eventId)
        if (highlightTimerRef.current)
          clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = setTimeout(setHighlightedEventId, 1500, null)
      }
    }
  }, [jumpToTimestamp, jumpToRequestId, items, virtualizer])

  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const handleDelete = useCallback((message: TimelineMessageItem) => {
    if (mockMode)
      return
    if (pendingDelete === message.eventId) {
      void deleteMessage(roomId, message.eventId)
      setPendingDelete(null)
    }
    else {
      setPendingDelete(message.eventId)
      setTimeout(setPendingDelete, 3000, null)
    }
  }, [roomId, mockMode, pendingDelete])

  const handlePin = useCallback(async (eventId: string) => {
    if (mockMode)
      return
    try {
      const { pinMessage, unpinMessage } = await import('@matrix-web/matrix-client')
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

  const [reportEventId, setReportEventId] = useState<string | null>(null)

  const handleReport = useCallback((eventId: string) => {
    setReportEventId(eventId)
  }, [])

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={parentRef}
        className="h-full overflow-y-auto py-2"
        onScroll={handleScroll}
      >
        {items.length === 0
          ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">{t('chat.empty_timeline')}</p>
              </div>
            )
          : (
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
                  const item = items[virtualItem.index]!
                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={virtualizer.measureElement}
                      className="absolute left-0 top-0 w-full"
                      style={{ transform: `translateY(${virtualItem.start}px)` }}
                    >
                      <TimelineRow
                        item={item}
                        layout={layout}
                        receiptsByEvent={receiptsByEvent}
                        pinnedIds={pinnedIds}
                        mockMode={mockMode}
                        highlightedEventId={highlightedEventId}
                        onResend={handleResend}
                        onReaction={handleReaction}
                        onEdit={onEditMessage}
                        onDelete={handleDelete}
                        onReply={onReplyMessage}
                        onPin={handlePin}
                        onReport={handleReport}
                        onThread={onThread}
                        onJumpToEvent={handleJumpToEvent}
                      />
                    </div>
                  )
                })}
              </div>
            )}
      </div>

      {/* Report dialog */}
      {reportEventId && (
        <ReportDialog
          open={!!reportEventId}
          roomId={roomId}
          eventId={reportEventId}
          onClose={() => setReportEventId(null)}
        />
      )}

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-4 right-4 rounded-full shadow-lg"
          onClick={scrollToBottom}
          aria-label={t('chat.scroll_to_bottom')}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TimelineRow — renders a single TimelineItem based on its `kind`
// ---------------------------------------------------------------------------

interface TimelineRowProps {
  item: TimelineItem
  layout: MessageLayout
  receiptsByEvent: Map<string, ReceiptInfo[]>
  pinnedIds: Set<string>
  mockMode: boolean
  highlightedEventId: string | null
  onResend: (eventId: string) => void
  onReaction: (eventId: string, emoji: string) => void
  onEdit?: (message: TimelineMessageItem) => void
  onDelete: (message: TimelineMessageItem) => void
  onReply?: (message: TimelineMessageItem) => void
  onPin: (eventId: string) => void
  onReport: (eventId: string) => void
  onThread?: (eventId: string) => void
  onJumpToEvent: (eventId: string) => void
}

function TimelineRow({
  item,
  layout,
  receiptsByEvent,
  pinnedIds,
  mockMode,
  highlightedEventId,
  onResend,
  onReaction,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onReport,
  onThread,
  onJumpToEvent,
}: TimelineRowProps) {
  switch (item.kind) {
    case 'day-divider':
      return <DayDivider label={item.label} timestamp={item.timestamp} />
    case 'unread-divider':
      return <UnreadDivider />
    case 'member-event':
      return <MemberEventRow item={item} />
    case 'state-event':
      return <StateEventRow item={item} />
    case 'message': {
      const messageProps = {
        message: item,
        collapsed: item.collapsed,
        receipts: receiptsByEvent.get(item.eventId),
        isPinned: pinnedIds.has(item.eventId),
        highlighted: highlightedEventId === item.eventId,
        onResend,
        onReaction,
        onEdit,
        onDelete,
        onReply,
        onPin: mockMode ? undefined : onPin,
        onReport: mockMode ? undefined : onReport,
        onThread,
        onJumpToEvent,
      }

      if (layout === 'compact')
        return <MessageCompact {...messageProps} />
      if (layout === 'modern')
        return <MessageModern {...messageProps} />
      return <MessageBubble {...messageProps} />
    }
  }
}
