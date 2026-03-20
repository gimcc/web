import type { MatrixClient } from 'matrix-js-sdk'

export interface UserProfile {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  avatarMxc: string | null
}

/**
 * Get profile info for a user.
 */
export async function getUserProfile(
  client: MatrixClient,
  userId: string,
): Promise<UserProfile> {
  const info = await client.getProfileInfo(userId)
  return {
    userId,
    displayName: (info.displayname as string) ?? null,
    avatarUrl: info.avatar_url
      ? client.mxcUrlToHttp(info.avatar_url as string, 96, 96, 'crop') ?? null
      : null,
    avatarMxc: (info.avatar_url as string) ?? null,
  }
}

/**
 * Get the current user's own profile.
 */
export async function getMyProfile(client: MatrixClient): Promise<UserProfile> {
  const userId = client.getUserId()
  if (!userId)
    throw new Error('Not logged in')
  return getUserProfile(client, userId)
}

/**
 * Set the current user's display name.
 */
export async function setDisplayName(
  client: MatrixClient,
  displayName: string,
): Promise<void> {
  await client.setDisplayName(displayName)
}

/**
 * Upload a file and set it as the current user's avatar.
 * Returns the mxc:// URL.
 */
export async function uploadAvatar(
  client: MatrixClient,
  file: File,
): Promise<string> {
  const response = await client.uploadContent(file, {
    name: file.name,
    type: file.type,
  })
  const mxcUrl = response.content_uri
  await client.setAvatarUrl(mxcUrl)
  return mxcUrl
}

/**
 * Remove the current user's avatar.
 */
export async function removeAvatar(client: MatrixClient): Promise<void> {
  await client.setAvatarUrl('')
}

/**
 * Get rooms shared between the current user and another user.
 */
export function getSharedRooms(
  client: MatrixClient,
  userId: string,
): { roomId: string, name: string, avatarUrl: string | null }[] {
  const myUserId = client.getUserId()
  const shared: { roomId: string, name: string, avatarUrl: string | null }[] = []

  for (const room of client.getRooms()) {
    if (room.getMyMembership() !== 'join')
      continue
    const members = room.getJoinedMembers()
    const hasMe = members.some(m => m.userId === myUserId)
    const hasTarget = members.some(m => m.userId === userId)
    if (hasMe && hasTarget) {
      shared.push({
        roomId: room.roomId,
        name: room.name ?? room.roomId,
        avatarUrl: room.getAvatarUrl(client.baseUrl, 32, 32, 'crop') ?? null,
      })
    }
  }

  return shared
}
