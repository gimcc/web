import type { KnownUser, UserSearchResult } from './room-service'

const MOCK_USERS: KnownUser[] = [
  { userId: '@alice:localhost', displayName: 'Alice', avatarUrl: null },
  { userId: '@bob:localhost', displayName: 'Bob', avatarUrl: null },
  { userId: '@charlie:localhost', displayName: 'Charlie', avatarUrl: null },
  { userId: '@diana:localhost', displayName: 'Diana', avatarUrl: null },
  { userId: '@eve:localhost', displayName: 'Eve', avatarUrl: null },
  { userId: '@frank:localhost', displayName: 'Frank', avatarUrl: null },
  { userId: '@grace:localhost', displayName: 'Grace', avatarUrl: null },
  { userId: '@henry:localhost', displayName: 'Henry', avatarUrl: null },
]

/**
 * Return mock known users.
 */
export function getMockKnownUsers(): KnownUser[] {
  return MOCK_USERS
}

/**
 * Search mock users.
 */
export function searchMockUsers(query: string): UserSearchResult[] {
  if (!query.trim())
    return []

  const q = query.toLowerCase()
  return MOCK_USERS
    .filter(u => u.displayName.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q))
    .map(u => ({ userId: u.userId, displayName: u.displayName, avatarUrl: u.avatarUrl }))
}

let mockRoomCounter = 100

/**
 * Create a mock DM room ID.
 */
export function createMockDmRoom(userId: string): string {
  const localpart = userId.split(':')[0]?.replace('@', '') ?? 'user'
  return `!mock-dm-${localpart}-${mockRoomCounter++}:localhost`
}

/**
 * Create a mock group room ID.
 */
export function createMockGroupRoom(): string {
  return `!mock-group-${mockRoomCounter++}:localhost`
}
