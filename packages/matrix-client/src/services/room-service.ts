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

  // eslint-disable-next-line e18e/prefer-array-to-sorted -- MapIterator lacks toSorted
  return [...usersMap.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  )
}

/**
 * Find existing DM room with a user (including rooms where invite is pending).
 */
function findExistingDm(client: MatrixClient, userId: string): Room | null {
  const myUserId = client.getUserId()

  for (const room of client.getRooms()) {
    // Check the m.direct account data or is_direct flag
    const isDirect = room.getDMInviter() != null
      || room.getMyMembership() === 'join'

    const joinedMembers = room.getJoinedMembers()
    const hasMe = joinedMembers.some(m => m.userId === myUserId)
    if (!hasMe)
      continue

    // Case 1: both joined (existing working DM)
    if (joinedMembers.length === 2 && joinedMembers.some(m => m.userId === userId))
      return room

    // Case 2: I joined, target is invited (pending invite)
    const allMembers = room.getMembersWithMembership('invite')
    const targetInvited = allMembers.some(m => m.userId === userId)
    if (targetInvited && joinedMembers.length === 1 && isDirect)
      return room
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

export interface CreateRoomOptions {
  name: string
  topic?: string
  isPublic?: boolean
  invite?: string[]
  encrypted?: boolean
}

/**
 * Create a public or private room.
 */
export async function createRoom(
  client: MatrixClient,
  options: CreateRoomOptions,
): Promise<string> {
  const result = await client.createRoom({
    name: options.name,
    topic: options.topic,
    invite: options.invite,
    visibility: options.isPublic ? Visibility.Public : Visibility.Private,
    preset: options.isPublic ? Preset.PublicChat : (options.encrypted ? Preset.TrustedPrivateChat : Preset.PrivateChat),
    initial_state: options.encrypted
      ? [{ type: 'm.room.encryption', state_key: '', content: { algorithm: 'm.megolm.v1.aes-sha2' } }]
      : [],
  })

  return result.room_id
}

/**
 * Join a room by ID or alias.
 */
export async function joinRoom(
  client: MatrixClient,
  roomIdOrAlias: string,
): Promise<string> {
  const result = await client.joinRoom(roomIdOrAlias)
  return result.roomId
}

/**
 * Leave a room.
 */
export async function leaveRoom(
  client: MatrixClient,
  roomId: string,
  forget?: boolean,
): Promise<void> {
  await client.leave(roomId)
  if (forget) {
    try {
      await client.forget(roomId)
    }
    catch { /* ignore */ }
  }
}

export interface PublicRoomInfo {
  roomId: string
  name: string
  topic: string | null
  canonicalAlias: string | null
  memberCount: number
  worldReadable: boolean
  avatarUrl: string | null
}

export interface BrowsePublicRoomsResult {
  rooms: PublicRoomInfo[]
  nextBatch: string | null
  totalRoomCount: number | null
}

/**
 * Search public rooms on a server.
 */
export async function searchPublicRooms(
  client: MatrixClient,
  query: string,
  limit: number = 20,
): Promise<{ roomId: string, name: string, topic: string | null, memberCount: number, worldReadable: boolean }[]> {
  const response = await client.publicRooms({
    limit,
    filter: { generic_search_term: query },
  })

  return (response.chunk ?? []).map((room: any) => ({
    roomId: room.room_id,
    name: room.name ?? room.canonical_alias ?? room.room_id,
    topic: room.topic ?? null,
    memberCount: room.num_joined_members ?? 0,
    worldReadable: room.world_readable ?? false,
  }))
}

/**
 * Browse public rooms on a specific server with pagination.
 */
export async function browsePublicRooms(
  client: MatrixClient,
  options: {
    server?: string
    query?: string
    limit?: number
    since?: string
  } = {},
): Promise<BrowsePublicRoomsResult> {
  const { server, query, limit = 20, since } = options

  const requestOptions: any = {
    limit,
    ...(query ? { filter: { generic_search_term: query } } : {}),
    ...(since ? { since } : {}),
  }

  if (server) {
    requestOptions.server = server
  }

  const response = await client.publicRooms(requestOptions)

  return {
    rooms: (response.chunk ?? []).map((room: any) => ({
      roomId: room.room_id,
      name: room.name ?? room.canonical_alias ?? room.room_id,
      topic: room.topic ?? null,
      canonicalAlias: room.canonical_alias ?? null,
      memberCount: room.num_joined_members ?? 0,
      worldReadable: room.world_readable ?? false,
      avatarUrl: room.avatar_url
        ? client.mxcUrlToHttp(room.avatar_url, 40, 40, 'crop') ?? null
        : null,
    })),
    nextBatch: response.next_batch ?? null,
    totalRoomCount: response.total_room_count_estimate ?? null,
  }
}

/**
 * Get room aliases (canonical + alternative).
 */
export function getRoomAliases(
  client: MatrixClient,
  roomId: string,
): { canonical: string | null, alternatives: string[] } {
  const room = client.getRoom(roomId)
  if (!room) {
    return { canonical: null, alternatives: [] }
  }

  const canonical = room.getCanonicalAlias() ?? null
  const altAliases = room.getAltAliases?.() ?? []

  return { canonical, alternatives: altAliases }
}

/**
 * Add an alias to a room.
 */
export async function addRoomAlias(
  client: MatrixClient,
  alias: string,
  roomId: string,
): Promise<void> {
  await client.createAlias(alias, roomId)
}

/**
 * Remove an alias from a room.
 */
export async function removeRoomAlias(
  client: MatrixClient,
  alias: string,
): Promise<void> {
  await client.deleteAlias(alias)
}

/**
 * Set the canonical (main) alias for a room.
 */
export async function setCanonicalAlias(
  client: MatrixClient,
  roomId: string,
  alias: string | null,
  altAliases: string[] = [],
): Promise<void> {
  const content: Record<string, unknown> = {
    alt_aliases: altAliases,
  }
  if (alias) {
    content.alias = alias
  }
  await client.sendStateEvent(roomId, 'm.room.canonical_alias' as any, content)
}

/**
 * Update room name.
 */
export async function updateRoomName(client: MatrixClient, roomId: string, name: string): Promise<void> {
  await client.setRoomName(roomId, name)
}

/**
 * Update room topic.
 */
export async function updateRoomTopic(client: MatrixClient, roomId: string, topic: string): Promise<void> {
  await client.setRoomTopic(roomId, topic)
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
