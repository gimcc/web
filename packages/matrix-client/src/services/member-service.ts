import type { MatrixClient } from 'matrix-js-sdk'

export interface RoomMemberInfo {
  userId: string
  displayName: string
  avatarUrl: string | null
  powerLevel: number
  membership: string
}

export function getRoomMembers(client: MatrixClient, roomId: string): RoomMemberInfo[] {
  const room = client.getRoom(roomId)
  if (!room)
    return []

  const powerLevels = room.currentState.getStateEvents('m.room.power_levels', '')
  const plContent = powerLevels?.getContent() ?? {}
  const usersDefault = (plContent.users_default as number) ?? 0
  const usersPl = (plContent.users as Record<string, number>) ?? {}

  return room.getJoinedMembers().map(member => ({
    userId: member.userId,
    displayName: member.name || member.userId,
    avatarUrl: member.getAvatarUrl(client.baseUrl, 40, 40, 'crop', false, false) ?? null,
    powerLevel: usersPl[member.userId] ?? usersDefault,
    membership: 'join',
  }))
}

export function getMyPowerLevel(client: MatrixClient, roomId: string): number {
  const room = client.getRoom(roomId)
  if (!room)
    return 0

  const myUserId = client.getUserId() ?? ''
  const powerLevels = room.currentState.getStateEvents('m.room.power_levels', '')
  const plContent = powerLevels?.getContent() ?? {}
  const usersDefault = (plContent.users_default as number) ?? 0
  const usersPl = (plContent.users as Record<string, number>) ?? {}

  return usersPl[myUserId] ?? usersDefault
}

export async function inviteUser(
  client: MatrixClient,
  roomId: string,
  userId: string,
): Promise<void> {
  await client.invite(roomId, userId)
}

export async function kickUser(
  client: MatrixClient,
  roomId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  await client.kick(roomId, userId, reason)
}

export async function banUser(
  client: MatrixClient,
  roomId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  await client.ban(roomId, userId, reason)
}

export async function unbanUser(
  client: MatrixClient,
  roomId: string,
  userId: string,
): Promise<void> {
  await client.unban(roomId, userId)
}
