import { useRoomsStore } from '@matrix-web/matrix-client'
import { useState } from 'react'
import { Sidebar, SidebarToggle } from '../../components/sidebar'
import { useMatrixClientLifecycle } from '../../hooks/use-matrix-client'

function ChatPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium text-foreground">Welcome to Matrix Web</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a room to start chatting
        </p>
      </div>
    </div>
  )
}

function ActiveRoomView({ roomId }: { roomId: string }) {
  const rooms = useRoomsStore(s => s.rooms)
  const room = rooms.get(roomId)

  return (
    <div className="flex h-full flex-col">
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
      </div>

      {/* Message area placeholder */}
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Message timeline coming in FEAT-007
        </p>
      </div>

      {/* Input placeholder */}
      <div className="border-t border-border px-4 py-3">
        <div className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground">
          Message input coming in FEAT-008
        </div>
      </div>
    </div>
  )
}

export function ChatLayout() {
  useMatrixClientLifecycle()

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
            {activeRoomName ?? 'Matrix Web'}
          </span>
        </div>

        {activeRoomId ? <ActiveRoomView roomId={activeRoomId} /> : <ChatPlaceholder />}
      </main>
    </div>
  )
}
