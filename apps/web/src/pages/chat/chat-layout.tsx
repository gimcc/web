import type { TimelineMessage } from '@matrix-web/matrix-client'
import { getMatrixClient, getPresenceService, leaveRoom, useAuthStore, useRoomsStore } from '@matrix-web/matrix-client'
import { LogOut, Search, Settings, Users } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSearch } from '../../components/chat/message-search'
import { TypingIndicator } from '../../components/chat/typing-indicator'
import { MemberListPanel } from '../../components/members/member-list-panel'
import { MessageInput } from '../../components/message-input'
import { MessageTimeline } from '../../components/message-timeline'
import { RoomSettingsDialog } from '../../components/room/room-settings-dialog'
import { Sidebar, SidebarToggle } from '../../components/sidebar'
import { useIdleDetector } from '../../hooks/use-idle-detector'
import { useMatrixClientLifecycle } from '../../hooks/use-matrix-client'

function ChatPlaceholder() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium text-foreground">{t('chat.welcome_title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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

  const [showMembers, setShowMembers] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingMessage, setEditingMessage] = useState<TimelineMessage | null>(null)
  const [replyingTo, setReplyingTo] = useState<TimelineMessage | null>(null)

  const handleEditMessage = useCallback((message: TimelineMessage) => {
    setEditingMessage(message)
    setReplyingTo(null)
  }, [])

  const handleReplyMessage = useCallback((message: TimelineMessage) => {
    setReplyingTo(message)
    setEditingMessage(null)
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

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Room header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">
            {room?.name ?? roomId}
          </h2>
          {room?.topic && (
            <span className="truncate text-sm text-muted-foreground">
              {room.topic}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setShowSearch(v => !v)
                setShowMembers(false)
              }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={t('ux.search')}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMembers(v => !v)
                setShowSearch(false)
              }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={t('member.title')}
            >
              <Users className="h-4 w-4" />
            </button>
            {!room?.isDirect && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={t('room.settings_title')}
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
              aria-label={t('room.leave')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Message timeline */}
        <MessageTimeline
          roomId={roomId}
          onEditMessage={handleEditMessage}
          onReplyMessage={handleReplyMessage}
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

      {/* Right panel: members or search */}
      {showMembers && <MemberListPanel roomId={roomId} onClose={() => setShowMembers(false)} />}
      {showSearch && <MessageSearch roomId={roomId} onClose={() => setShowSearch(false)} />}
    </div>
  )
}

export function ChatLayout() {
  useMatrixClientLifecycle()

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
          <span className="ml-3 text-sm font-medium text-foreground">
            {activeRoomName ?? t('app.name')}
          </span>
        </div>

        {activeRoomId ? <ActiveRoomView roomId={activeRoomId} /> : <ChatPlaceholder />}
      </main>
    </div>
  )
}
