import { create } from 'zustand'

export interface RoomSummary {
  roomId: string
  name: string
  topic: string | null
  avatarUrl: string | null
  isDirect: boolean
  memberCount: number
  lastMessage: LastMessagePreview | null
  unreadCount: number
  highlightCount: number
  timestamp: number
}

export interface LastMessagePreview {
  senderId: string
  body: string
  timestamp: number
  type: string
}

export interface RoomsState {
  rooms: Map<string, RoomSummary>
  activeRoomId: string | null
  setRooms: (rooms: RoomSummary[]) => void
  upsertRoom: (room: RoomSummary) => void
  removeRoom: (roomId: string) => void
  setActiveRoom: (roomId: string | null) => void
  updateUnreadCount: (roomId: string, unread: number, highlight: number) => void
  reset: () => void
}

const initialState = {
  rooms: new Map<string, RoomSummary>(),
  activeRoomId: null as string | null,
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  ...initialState,

  setRooms: (rooms) => {
    const map = new Map<string, RoomSummary>()
    for (const room of rooms) {
      map.set(room.roomId, room)
    }
    set({ rooms: map })
  },

  upsertRoom: (room) => {
    const rooms = new Map(get().rooms)
    rooms.set(room.roomId, room)
    set({ rooms })
  },

  removeRoom: (roomId) => {
    const rooms = new Map(get().rooms)
    rooms.delete(roomId)
    const activeRoomId = get().activeRoomId === roomId ? null : get().activeRoomId
    set({ rooms, activeRoomId })
  },

  setActiveRoom: roomId => set({ activeRoomId: roomId }),

  updateUnreadCount: (roomId, unread, highlight) => {
    const rooms = new Map(get().rooms)
    const existing = rooms.get(roomId)
    if (existing) {
      rooms.set(roomId, { ...existing, unreadCount: unread, highlightCount: highlight })
      set({ rooms })
    }
  },

  reset: () => set({ rooms: new Map(), activeRoomId: null }),
}))
