import type { MatrixClient } from 'matrix-js-sdk'
import type { DeviceTrustInfo } from './crypto-service'
import { getDeviceTrust, getUserTrust, isRoomEncrypted } from './crypto-service'
import { getRoomMembers } from './member-service'

// ─── Types ──────────────────────────────────────────────────────────

export interface UserDeviceInfo {
  deviceId: string
  displayName: string | null
  trust: DeviceTrustInfo | null
}

export interface UserTrustSummary {
  userId: string
  devices: UserDeviceInfo[]
  allVerified: boolean
  loading: boolean
}

export interface RoomTrustSummary {
  encrypted: boolean
  totalDevices: number
  verifiedDevices: number
  allVerified: boolean
  unverifiedUsers: string[]
}

// ─── User Devices ───────────────────────────────────────────────────

export async function getUserDevicesWithTrust(
  client: MatrixClient,
  userId: string,
): Promise<UserDeviceInfo[]> {
  const crypto = client.getCrypto()
  if (!crypto) return []

  const deviceMap = await crypto.getUserDeviceInfo([userId])
  const devices = deviceMap.get(userId)
  if (!devices) return []

  const result: UserDeviceInfo[] = []
  for (const [deviceId, device] of devices) {
    const trust = await getDeviceTrust(client, userId, deviceId)
    result.push({
      deviceId,
      displayName: device.displayName ?? null,
      trust,
    })
  }
  return result
}

// ─── User Trust Check ───────────────────────────────────────────────

export async function isUserFullyVerified(
  client: MatrixClient,
  userId: string,
): Promise<boolean> {
  const trust = await getUserTrust(client, userId)
  return trust.verified
}

// ─── Room Trust Summary ─────────────────────────────────────────────

export async function getRoomTrustSummary(
  client: MatrixClient,
  roomId: string,
): Promise<RoomTrustSummary> {
  const encrypted = await isRoomEncrypted(client, roomId)
  if (!encrypted) {
    return { encrypted: false, totalDevices: 0, verifiedDevices: 0, allVerified: false, unverifiedUsers: [] }
  }

  const members = getRoomMembers(client, roomId)
  const crypto = client.getCrypto()
  if (!crypto) {
    return { encrypted: true, totalDevices: 0, verifiedDevices: 0, allVerified: false, unverifiedUsers: [] }
  }

  let totalDevices = 0
  let verifiedDevices = 0
  const unverifiedUsers: string[] = []

  // Batch fetch device info for all members
  const userIds = members.map(m => m.userId)
  const deviceMap = await crypto.getUserDeviceInfo(userIds)

  for (const [userId, devices] of deviceMap) {
    let userHasUnverified = false
    for (const [deviceId] of devices) {
      totalDevices++
      const trust = await getDeviceTrust(client, userId, deviceId)
      if (trust?.verified) {
        verifiedDevices++
      } else {
        userHasUnverified = true
      }
    }
    if (userHasUnverified) {
      unverifiedUsers.push(userId)
    }
  }

  return {
    encrypted: true,
    totalDevices,
    verifiedDevices,
    allVerified: totalDevices > 0 && totalDevices === verifiedDevices,
    unverifiedUsers,
  }
}
