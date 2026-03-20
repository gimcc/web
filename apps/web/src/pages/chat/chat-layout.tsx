import type { TimelineMessageItem } from '@matrix-web/matrix-client'
import { getMatrixClient, getPresenceService, leaveRoom, useAuthStore, useRoomsStore, useThreadsStore } from '@matrix-web/matrix-client'
import { Bell, LogOut, MessageSquare, Search, Settings, Users } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { JumpToDate } from '../../components/chat/jump-to-date'
import { MessageSearch } from '../../components/chat/message-search'
import { TypingIndicator } from '../../components/chat/typing-indicator'
import { MemberListPanel } from '../../components/members/member-list-panel'
import { MessageInput } from '../../components/message-input'
import { MessageTimeline } from '../../components/message-timeline'
import { NotificationInbox } from '../../components/notification-inbox'
import { PinnedMessagesBar } from '../../components/pinned-messages-bar'
import { RoomNotificationToggle } from '../../components/room-notification-toggle'
import { SyncStatusIndicator } from '../../components/sync-status-indicator'
import { RoomSettingsDialog } from '../../components/room/room-settings-dialog'
import { TombstoneBanner } from '../../components/room/tombstone-banner'
import { Sidebar, SidebarToggle } from '../../components/sidebar'
import { ThreadPanel } from '../../components/thread-panel'
import { Avatar } from '../../components/ui/avatar'
import { Button } from '../../components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip'
import { useDeepLinkHandler } from '../../hooks/use-deep-link'
import { useIdleDetector } from '../../hooks/use-idle-detector'
import { useMatrixClientLifecycle } from '../../hooks/use-matrix-client'

function ChatPlaceholder() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full items-center justify-center bg-muted/20">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t('chat.welcome_title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('chat.welcome_subtitle')}
        </p>
      </div>
    </div>
  )
}

function ActiveRoomView({ roomId }: { roomId: string }) {
  const { t } = useTranslation()
  const rooms = useRoomsStore(s => s.rooms)
  const room = rooms.get(roomId)
  const mockMode = useAuthStore(s => s.mockMode)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const activeThreadId = useThreadsStore(s => s.activeThreadId)
  const setActiveThread = useThreadsStore(s => s.setActiveThread)

  const [showMembers, setShowMembers] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingMessage, setEditingMessage] = useState<TimelineMessageItem | null>(null)
  const [replyingTo, setReplyingTo] = useState<TimelineMessageItem | null>(null)
  const [pinRefreshKey, setPinRefreshKey] = useState(0)
  const [jumpToRequest, setJumpToRequest] = useState<{ timestamp: number; id: number } | null>(null)

  const handleEditMessage = useCallback((message: TimelineMessageItem) => {
    setEditingMessage(message)
    setReplyingTo(null)
  }, [])

  const handleReplyMessage = useCallback((message: TimelineMessageItem) => {
    setReplyingTo(message)
    setEditingMessage(null)
  }, [])

  const handleOpenThread = useCallback((eventId: string) => {
    setActiveThread(eventId)
  }, [setActiveThread])

  const handleCloseThread = useCallback(() => {
    setActiveThread(null)
  }, [setActiveThread])

  const handlePinChange = useCallback(() => {
    setPinRefreshKey(k => k + 1)
  }, [])

  const handleJumpToDate = useCallback((timestamp: number) => {
    setJumpToRequest({ timestamp, id: Date.now() })
  }, [])

  const handleLeaveRoom = useCallback(async () => {
    if (mockMode)
      return
    const client = getMatrixClient()
    if (!client)
      return
    try {
      await leaveRoom(client, roomId)
      setActiveRoom(null)
    }
    catch { /* ignore */ }
  }, [roomId, mockMode, setActiveRoom])

  const roomName = room?.name ?? roomId

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Room header */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-2 sm:px-4 sm:py-2.5">
          <Avatar
            name={roomName}
            src={room?.avatarUrl ?? undefined}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
              {roomName}
            </h2>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {room?.topic
                ? room.topic
                : room?.isDirect
                  ? t('chat.direct_message')
                  : room?.memberCount
                    ? t('chat.members_count', { count: room.memberCount })
                    : ''}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <SyncStatusIndicator />
            {!mockMode && <RoomNotificationToggle roomId={roomId} />}
            <JumpToDate onJumpToDate={handleJumpToDate} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setShowSearch(v => !v)
                    setShowMembers(false)
                  }}
                  aria-label={t('ux.search')}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('ux.search')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setShowMembers(v => !v)
                    setShowSearch(false)
                  }}
                  aria-label={t('member.title')}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('member.title')}</TooltipContent>
            </Tooltip>
            {!room?.isDirect && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowSettings(true)}
                    aria-label={t('room.settings_title')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('room.settings_title')}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleLeaveRoom}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t('room.leave')}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('room.leave')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tombstone banner */}
        {!mockMode && <TombstoneBanner roomId={roomId} />}

        {/* Pinned messages */}
        {!mockMode && <PinnedMessagesBar roomId={roomId} refreshKey={pinRefreshKey} />}

        {/* Message timeline */}
        <MessageTimeline
          roomId={roomId}
          onEditMessage={handleEditMessage}
          onReplyMessage={handleReplyMessage}
          onThread={handleOpenThread}
          onPinChange={handlePinChange}
          jumpToTimestamp={jumpToRequest?.timestamp ?? null}
          jumpToRequestId={jumpToRequest?.id ?? null}
        />

        {/* Typing indicator */}
        <TypingIndicator roomId={roomId} />

        {/* Message input */}
        <MessageInput
          roomId={roomId}
          editingMessage={editingMessage}
          replyingTo={replyingTo}
          onCancelEdit={() => setEditingMessage(null)}
          onCancelReply={() => setReplyingTo(null)}
        />

        {/* Room settings dialog */}
        <RoomSettingsDialog open={showSettings} roomId={roomId} onClose={() => setShowSettings(false)} />
      </div>

      {/* Right panel: members or search — overlay on mobile, inline on desktop */}
      {showMembers && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setShowMembers(false)}
            aria-label={t('common.close')}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full lg:static lg:z-auto">
            <MemberListPanel roomId={roomId} onClose={() => setShowMembers(false)} />
          </div>
        </>
      )}
      {showSearch && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setShowSearch(false)}
            aria-label={t('common.close')}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full lg:static lg:z-auto">
            <MessageSearch roomId={roomId} onClose={() => setShowSearch(false)} />
          </div>
        </>
      )}

      {/* Thread side panel — overlay on mobile */}
      {activeThreadId && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={handleCloseThread}
            aria-label={t('common.close')}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full lg:static lg:z-auto">
            <ThreadPanel
              roomId={roomId}
              threadRootId={activeThreadId}
              onClose={handleCloseThread}
              onReaction={() => {}}
            />
          </div>
        </>
      )}
    </div>
  )
}

export function ChatLayout() {
  useMatrixClientLifecycle()
  useDeepLinkHandler()

  const handleIdle = useCallback(() => {
    getPresenceService()?.setUnavailable()
  }, [])

  const handleActive = useCallback(() => {
    getPresenceService()?.setOnline()
  }, [])

  useIdleDetector(handleIdle, handleActive)

  const { t } = useTranslation()
  const activeRoomId = useRoomsStore(s => s.activeRoomId)
  const activeRoomName = useRoomsStore(s =>
    s.activeRoomId ? s.rooms.get(s.activeRoomId)?.name ?? null : null,
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
      />

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center border-b border-border px-4 py-2 md:hidden">
          <SidebarToggle onToggle={() => setSidebarOpen(true)} />
          <span className="ml-3 flex-1 text-sm font-medium text-foreground">
            {activeRoomName ?? t('app.name')}
          </span>
          <button
            type="button"
            onClick={() => setShowNotifications(v => !v)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t('notification_inbox.title')}
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {activeRoomId ? <ActiveRoomView roomId={activeRoomId} /> : <ChatPlaceholder />}
          </div>

          {showNotifications && (
            <NotificationInbox onClose={() => setShowNotifications(false)} />
          )}
        </div>
      </main>
    </div>
  )
}
