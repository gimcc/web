import type { MatrixClient, Room } from 'matrix-js-sdk'
import { Preset, Visibility } from 'matrix-js-sdk'
import { extractSingleRoomSummary } from '../client/client-manager'

export interface KnownUser {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export interface CreateDmOptions {
  userId: string
  encrypted?: boolean
}

export interface CreateGroupOptions {
  name: string
  topic?: string
  userIds: string[]
  encrypted?: boolean
}

export interface UserSearchResult {
  userId: string
  displayName: string | null
  avatarUrl: string | null
}

/**
 * Get all known users from joined rooms (deduplicated).
 */
export function getKnownUsers(client: MatrixClient): KnownUser[] {
  const myUserId = client.getUserId()
  const usersMap = new Map<string, KnownUser>()

  for (const room of client.getRooms()) {
    for (const member of room.getJoinedMembers()) {
      if (member.userId === myUserId)
        continue
      if (usersMap.has(member.userId))
        continue

      usersMap.set(member.userId, {
        userId: member.userId,
        displayName: member.name || member.userId,
        avatarUrl: member.getAvatarUrl(client.baseUrl, 40, 40, 'crop', false, false) ?? null,
      })
    }
  }

  return [...usersMap.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  )
}

/**
 * Find existing DM room with a user.
 */
function findExistingDm(client: MatrixClient, userId: string): Room | null {
  const myUserId = client.getUserId()

  for (const room of client.getRooms()) {
    const members = room.getJoinedMembers()
    if (members.length === 2) {
      const hasMe = members.some(m => m.userId === myUserId)
      const hasTarget = members.some(m => m.userId === userId)
      if (hasMe && hasTarget)
        return room
    }
  }
  return null
}

/**
 * Create a DM room or return existing one.
 */
export async function createDmRoom(
  client: MatrixClient,
  options: CreateDmOptions,
): Promise<string> {
  const existing = findExistingDm(client, options.userId)
  if (existing)
    return existing.roomId

  const result = await client.createRoom({
    is_direct: true,
    invite: [options.userId],
    visibility: Visibility.Private,
    preset: options.encrypted ? Preset.TrustedPrivateChat : Preset.PrivateChat,
    initial_state: options.encrypted
      ? [{ type: 'm.room.encryption', state_key: '', content: { algorithm: 'm.megolm.v1.aes-sha2' } }]
      : [],
  })

  return result.room_id
}

/**
 * Create a group room.
 */
export async function createGroupRoom(
  client: MatrixClient,
  options: CreateGroupOptions,
): Promise<string> {
  const result = await client.createRoom({
    name: options.name,
    topic: options.topic,
    invite: options.userIds,
    visibility: Visibility.Private,
    preset: options.encrypted ? Preset.TrustedPrivateChat : Preset.PrivateChat,
    initial_state: options.encrypted
      ? [{ type: 'm.room.encryption', state_key: '', content: { algorithm: 'm.megolm.v1.aes-sha2' } }]
      : [],
  })

  return result.room_id
}

/**
 * Search users in homeserver directory.
 */
export async function searchUsers(
  client: MatrixClient,
  query: string,
  limit: number = 20,
): Promise<UserSearchResult[]> {
  if (!query.trim())
    return []

  const response = await client.searchUserDirectory({ term: query, limit })

  return response.results.map(user => ({
    userId: user.user_id,
    displayName: user.display_name ?? null,
    avatarUrl: user.avatar_url
      ? client.mxcUrlToHttp(user.avatar_url, 40, 40, 'crop') ?? null
      : null,
  }))
}

/**
 * Extract room summary after creation (helper for UI).
 */
export function extractNewRoomSummary(client: MatrixClient, roomId: string) {
  const room = client.getRoom(roomId)
  if (!room)
    return null
  return extractSingleRoomSummary(client, room)
}
