import type { MatrixClient } from 'matrix-js-sdk'

export interface TombstoneInfo {
  body: string
  replacementRoomId: string
}

/**
 * Check if a room has been tombstoned (migrated).
 * Returns the tombstone info or null if not tombstoned.
 */
export function getRoomTombstone(client: MatrixClient, roomId: string): TombstoneInfo | null {
  const room = client.getRoom(roomId)
  const event = room?.currentState.getStateEvents('m.room.tombstone', '')
  if (!event)
    return null

  const content = event.getContent()
  const replacementRoomId = content?.replacement_room
  if (!replacementRoomId)
    return null

  return {
    body: content.body ?? 'This room has been replaced.',
    replacementRoomId,
  }
}

/**
 * Navigate to the replacement room after a tombstone event.
 * Joins the replacement room if not already a member.
 */
export async function followTombstone(
  client: MatrixClient,
  replacementRoomId: string,
): Promise<string> {
  if (!replacementRoomId.startsWith('!'))
    throw new Error('Invalid replacement room ID format')

  const room = client.getRoom(replacementRoomId)
  if (room && room.getMyMembership() === 'join')
    return replacementRoomId

  const result = await client.joinRoom(replacementRoomId)
  return result.roomId
}
