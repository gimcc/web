import { getMatrixClient } from '../client/client-manager'

export type RoomNotificationLevel = 'all' | 'mentions' | 'mute'

const ACCOUNT_DATA_TYPE = 'im.vector.room_notification_level'

/**
 * Get the notification level for a room from account data.
 */
export function getRoomNotificationLevel(roomId: string): RoomNotificationLevel {
  const client = getMatrixClient()
  if (!client)
    return 'all'

  const room = client.getRoom(roomId)
  if (!room)
    return 'all'

  const data = room.getAccountData(ACCOUNT_DATA_TYPE)
  if (!data)
    return 'all'

  const level = data.getContent()?.level
  if (level === 'mentions' || level === 'mute')
    return level
  return 'all'
}

/**
 * Set the notification level for a room.
 */
export async function setRoomNotificationLevel(
  roomId: string,
  level: RoomNotificationLevel,
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  await client.setRoomAccountData(roomId, ACCOUNT_DATA_TYPE as any, { level })
}
