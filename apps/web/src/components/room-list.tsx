import { useRoomsStore } from '@matrix-web/matrix-client'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RoomListItem } from './room-list-item'
import { Input } from './ui/input'

export function RoomList() {
  const rooms = useRoomsStore(s => s.rooms)
  const activeRoomId = useRoomsStore(s => s.activeRoomId)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const [searchQuery, setSearchQuery] = useState('')

  const sortedRooms = useMemo(() => {
    const list = [...rooms.values()]

    // Filter by search
    const filtered = searchQuery.trim()
      ? list.filter(room =>
          room.name.toLowerCase().includes(searchQuery.toLowerCase())
          || (room.lastMessage?.body.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      : list

    // Sort by most recent activity
    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }, [rooms, searchQuery])

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sortedRooms.length === 0
          ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No rooms found' : 'No rooms yet'}
              </p>
            )
          : (
              <div className="space-y-0.5">
                {sortedRooms.map(room => (
                  <RoomListItem
                    key={room.roomId}
                    room={room}
                    isActive={room.roomId === activeRoomId}
                    onSelect={setActiveRoom}
                  />
                ))}
              </div>
            )}
      </div>
    </div>
  )
}
