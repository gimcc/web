import type { QueryClient } from '@tanstack/query-core'

export const queryKeys = {
  rooms: {
    all: ['rooms'] as const,
    list: () => [...queryKeys.rooms.all, 'list'] as const,
    detail: (roomId: string) => [...queryKeys.rooms.all, 'detail', roomId] as const,
    members: (roomId: string) => [...queryKeys.rooms.all, 'members', roomId] as const,
  },
  messages: {
    all: ['messages'] as const,
    timeline: (roomId: string) => [...queryKeys.messages.all, 'timeline', roomId] as const,
  },
  presence: {
    all: ['presence'] as const,
    user: (userId: string) => [...queryKeys.presence.all, userId] as const,
  },
} as const

export function invalidateRoomList(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.list() })
}

export function invalidateRoomDetail(queryClient: QueryClient, roomId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.detail(roomId) })
}

export function invalidateRoomMembers(queryClient: QueryClient, roomId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.members(roomId) })
}

export function invalidateTimeline(queryClient: QueryClient, roomId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.messages.timeline(roomId) })
}

export function invalidatePresence(queryClient: QueryClient, userId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.presence.user(userId) })
}

export function invalidateAll(queryClient: QueryClient): void {
  void queryClient.invalidateQueries()
}
