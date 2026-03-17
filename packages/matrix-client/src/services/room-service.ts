import { EventType, Preset, Visibility } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useRoomsStore } from '../stores/rooms-store'

/**
 * Find an existing direct room with the given user ID by checking
 * the m.direct account data event.
 */
export function findExistingDirectRoom(userId: string): string | null {
  const client = getMatrixClient()
  if (!client)
    return null

  // Check m.direct account data for existing DM mapping
  const directEvent = client.getAccountData(EventType.Direct)
  if (directEvent) {
    const directMap = directEvent.getContent()
    const roomIds = directMap[userId]
    if (roomIds?.length) {
      // Return the first room that we are still a member of
      for (const roomId of roomIds) {
        const room = client.getRoom(roomId)
        if (room && room.getMyMembership() === 'join') {
          return roomId
        }
      }
    }
  }

  // Fallback: check rooms store for isDirect rooms with this user
  const rooms = useRoomsStore.getState().rooms
  for (const [, summary] of rooms) {
    if (!summary.isDirect)
      continue
    const room = client.getRoom(summary.roomId)
    if (!room)
      continue
    const members = room.getJoinedMembers()
    if (members.length === 2 && members.some(m => m.userId === userId)) {
      return summary.roomId
    }
  }

  return null
}

/**
 * Create a new direct chat room with the given user ID.
 * If a DM already exists, returns the existing room ID instead.
 */
export async function createDirectRoom(userId: string): Promise<string> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  // Check for existing DM first
  const existingRoomId = findExistingDirectRoom(userId)
  if (existingRoomId)
    return existingRoomId

  // Create a new DM room
  const response = await client.createRoom({
    preset: Preset.TrustedPrivateChat,
    visibility: Visibility.Private,
    invite: [userId],
    is_direct: true,
    initial_state: [],
  })

  const roomId = response.room_id

  // Update m.direct account data
  const directEvent = client.getAccountData(EventType.Direct)
  const directMap = { ...(directEvent?.getContent() ?? {}) }
  if (!directMap[userId]) {
    directMap[userId] = []
  }
  directMap[userId] = [...directMap[userId], roomId]
  await client.setAccountData(EventType.Direct, directMap)

  return roomId
}
