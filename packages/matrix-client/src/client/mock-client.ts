import type { AuthSession } from '../auth/auth-service'
import type { RoomSummary } from '../stores/rooms-store'
import { useConnectionStore } from '../stores/connection-store'
import { useRoomsStore } from '../stores/rooms-store'

function createMockRooms(): RoomSummary[] {
  const now = Date.now()
  return [
    {
      roomId: '!mock-general:localhost',
      name: 'General',
      topic: 'General discussion',
      avatarUrl: null,
      isEncrypted: false,
      isDirect: false,
      membership: 'join',
      memberCount: 42,
      lastMessage: {
        senderId: '@alice:localhost',
        body: 'Hello everyone!',
        timestamp: now - 60_000,
        type: 'm.room.message',
      },
      unreadCount: 3,
      highlightCount: 0,
      timestamp: now - 60_000,
    },
    {
      roomId: '!mock-random:localhost',
      name: 'Random',
      topic: 'Off-topic conversations',
      avatarUrl: null,
      isEncrypted: false,
      isDirect: false,
      membership: 'join',
      memberCount: 28,
      lastMessage: {
        senderId: '@bob:localhost',
        body: 'Check this out!',
        timestamp: now - 120_000,
        type: 'm.room.message',
      },
      unreadCount: 0,
      highlightCount: 0,
      timestamp: now - 120_000,
    },
    {
      roomId: '!mock-dm-alice:localhost',
      name: 'Alice',
      topic: null,
      avatarUrl: null,
      isEncrypted: true,
      isDirect: true,
      membership: 'join',
      memberCount: 2,
      lastMessage: {
        senderId: '@alice:localhost',
        body: 'See you tomorrow!',
        timestamp: now - 300_000,
        type: 'm.room.message',
      },
      unreadCount: 1,
      highlightCount: 1,
      timestamp: now - 300_000,
    },
    {
      roomId: '!mock-dm-bob:localhost',
      name: 'Bob',
      topic: null,
      avatarUrl: null,
      isEncrypted: true,
      isDirect: true,
      membership: 'join',
      memberCount: 2,
      lastMessage: {
        senderId: '@mock-user:localhost',
        body: 'Got it, thanks!',
        timestamp: now - 600_000,
        type: 'm.room.message',
      },
      unreadCount: 0,
      highlightCount: 0,
      timestamp: now - 600_000,
    },
    {
      roomId: '!mock-dev:localhost',
      name: 'Development',
      topic: 'Engineering discussions',
      avatarUrl: null,
      isEncrypted: false,
      isDirect: false,
      membership: 'join',
      memberCount: 15,
      lastMessage: {
        senderId: '@charlie:localhost',
        body: 'PR merged successfully',
        timestamp: now - 900_000,
        type: 'm.room.message',
      },
      unreadCount: 5,
      highlightCount: 0,
      timestamp: now - 900_000,
    },
  ]
}

let mockActive = false
let mockInterval: ReturnType<typeof setInterval> | null = null

export async function startMockClient(_session: AuthSession): Promise<void> {
  if (mockActive)
    return

  const connectionStore = useConnectionStore.getState()
  connectionStore.setStatus('connecting')

  // Simulate connection delay
  await new Promise<void>(resolve => setTimeout(resolve, 500))

  mockActive = true
  connectionStore.setStatus('syncing')
  connectionStore.setLastSync(Date.now())

  // Load mock rooms with fresh timestamps
  useRoomsStore.getState().setRooms(createMockRooms())

  // Simulate periodic sync updates
  mockInterval = setInterval(() => {
    if (!mockActive)
      return
    useConnectionStore.getState().setLastSync(Date.now())
  }, 30_000)
}

export function stopMockClient(): void {
  mockActive = false

  if (mockInterval) {
    clearInterval(mockInterval)
    mockInterval = null
  }

  useConnectionStore.getState().reset()
  useRoomsStore.getState().reset()
}

export function isMockActive(): boolean {
  return mockActive
}

export function getMockRooms(): RoomSummary[] {
  return createMockRooms()
}
