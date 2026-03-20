import type { RoomSummary } from '@matrix-web/matrix-client'
import { useRoomsStore } from '@matrix-web/matrix-client'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { RoomListItem } from './room-list-item'
import { Input } from './ui/input'

type FilterTab = 'all' | 'unread' | 'direct' | 'groups'

export function RoomList() {
  const { t } = useTranslation()
  const rooms = useRoomsStore(s => s.rooms)
  const activeRoomId = useRoomsStore(s => s.activeRoomId)
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const filteredRooms = useMemo(() => {
    const list = [...rooms.values()].filter(room => room.membership !== 'invite')

    // Filter by search
    let filtered = searchQuery.trim()
      ? list.filter(room =>
          room.name.toLowerCase().includes(searchQuery.toLowerCase())
          || (room.lastMessage?.body.toLowerCase().includes(searchQuery.toLowerCase())),
        )
      : list

    // Filter by tab
    if (activeFilter === 'unread') {
      filtered = filtered.filter(room => room.unreadCount > 0)
    }
    else if (activeFilter === 'direct') {
      filtered = filtered.filter(room => room.isDirect)
    }
    else if (activeFilter === 'groups') {
      filtered = filtered.filter(room => !room.isDirect)
    }

    // Sort by most recent activity
    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }, [rooms, searchQuery, activeFilter])

  const filters: { id: FilterTab; label: string }[] = [
    { id: 'all', label: t('room_list.filter_all') },
    { id: 'unread', label: t('room_list.filter_unread') },
    { id: 'direct', label: t('room_list.filter_direct') },
    { id: 'groups', label: t('room_list.filter_groups') },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-3 pt-1">
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

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2">
        {filters.map(filter => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeFilter === filter.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filteredRooms.length === 0
          ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? t('room_list.empty_search') : t('room_list.empty_default')}
              </p>
            )
          : (
              <div className="space-y-0.5">
                {filteredRooms.map(room => (
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
