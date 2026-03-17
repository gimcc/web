import type { RoomSummary } from '@matrix-web/matrix-client'
import { useRoomsStore } from '@matrix-web/matrix-client'
import { ChevronDown, ChevronRight, MessageCircle, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { RoomListItem } from './room-list-item'
import { Input } from './ui/input'

interface SectionProps {
  label: string
  icon: React.ReactNode
  rooms: RoomSummary[]
  activeRoomId: string | null
  onSelect: (roomId: string) => void
  defaultOpen?: boolean
}

function RoomSection({ label, icon, rooms, activeRoomId, onSelect, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (rooms.length === 0)
    return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        <span>{label}</span>
        <span className={cn(
          'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium',
          'bg-muted text-muted-foreground',
        )}
        >
          {rooms.length}
        </span>
      </button>
      {open && (
        <div className="space-y-0.5">
          {rooms.map(room => (
            <RoomListItem
              key={room.roomId}
              room={room}
              isActive={room.roomId === activeRoomId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RoomList() {
  const { t } = useTranslation()
  const rooms = useRoomsStore(s => s.rooms)
  const activeRoomId = useRoomsStore(s => s.activeRoomId)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const [searchQuery, setSearchQuery] = useState('')

  const { directRooms, groupRooms } = useMemo(() => {
    const list = [...rooms.values()].filter(room => room.membership !== 'invite')

    // Filter by search
    const filtered = searchQuery.trim()
      ? list.filter(room =>
          room.name.toLowerCase().includes(searchQuery.toLowerCase())
          || (room.lastMessage?.body.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      : list

    // Sort by most recent activity
    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp)

    // Separate direct and group rooms
    const directRooms: RoomSummary[] = []
    const groupRooms: RoomSummary[] = []
    for (const room of sorted) {
      if (room.isDirect) {
        directRooms.push(room)
      }
      else {
        groupRooms.push(room)
      }
    }

    return { directRooms, groupRooms }
  }, [rooms, searchQuery])

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('room_list.search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {directRooms.length === 0 && groupRooms.length === 0
          ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? t('room_list.empty_search') : t('room_list.empty_default')}
              </p>
            )
          : (
              <div className="space-y-2">
                <RoomSection
                  label={t('room_list.section_direct')}
                  icon={<MessageCircle className="h-3 w-3" />}
                  rooms={directRooms}
                  activeRoomId={activeRoomId}
                  onSelect={setActiveRoom}
                />
                <RoomSection
                  label={t('room_list.section_group')}
                  icon={<Users className="h-3 w-3" />}
                  rooms={groupRooms}
                  activeRoomId={activeRoomId}
                  onSelect={setActiveRoom}
                />
              </div>
            )}
      </div>
    </div>
  )
}
