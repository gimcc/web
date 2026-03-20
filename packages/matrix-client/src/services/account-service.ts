import type { IMyDevice, MatrixClient } from 'matrix-js-sdk'

// ─── 3PID (Third-party Identifiers) ────────────────────────────────

export interface ThreePid {
  medium: 'email' | 'msisdn'
  address: string
  validatedAt?: number
  addedAt?: number
}

export async function getThreePids(client: MatrixClient): Promise<ThreePid[]> {
  const response = await client.getThreePids()
  return (response.threepids ?? []).map(tp => ({
    medium: tp.medium as 'email' | 'msisdn',
    address: tp.address,
    validatedAt: tp.validated_at,
    addedAt: tp.added_at,
  }))
}

export async function requestEmailToken(
  client: MatrixClient,
  email: string,
  clientSecret: string,
  sendAttempt: number,
): Promise<string> {
  const response = await client.requestAdd3pidEmailToken(email, clientSecret, sendAttempt)
  return response.sid
}

export async function requestMsisdnToken(
  client: MatrixClient,
  phoneNumber: string,
  countryCode: string,
  clientSecret: string,
  sendAttempt: number,
): Promise<string> {
  const response = await client.requestAdd3pidMsisdnToken(countryCode, phoneNumber, clientSecret, sendAttempt)
  return response.sid
}

export async function addThreePid(
  client: MatrixClient,
  clientSecret: string,
  sid: string,
): Promise<void> {
  await client.addThreePidOnly({
    client_secret: clientSecret,
    sid,
  })
}

export async function deleteThreePid(
  client: MatrixClient,
  medium: string,
  address: string,
): Promise<void> {
  await client.deleteThreePid(medium, address)
}

// ─── Device / Session Management ────────────────────────────────────

export interface DeviceInfo {
  deviceId: string
  displayName: string | null
  lastSeenIp: string | null
  lastSeenTs: number | null
}

export async function getDevices(client: MatrixClient): Promise<DeviceInfo[]> {
  const response = await client.getDevices()
  return (response.devices ?? []).map((d: IMyDevice) => ({
    deviceId: d.device_id,
    displayName: d.display_name ?? null,
    lastSeenIp: d.last_seen_ip ?? null,
    lastSeenTs: d.last_seen_ts ?? null,
  }))
}

export async function deleteDevice(
  client: MatrixClient,
  deviceId: string,
): Promise<void> {
  await client.deleteDevice(deviceId)
}

export async function deleteDevices(
  client: MatrixClient,
  deviceIds: string[],
): Promise<void> {
  await client.deleteMultipleDevices(deviceIds)
}

export async function renameDevice(
  client: MatrixClient,
  deviceId: string,
  displayName: string,
): Promise<void> {
  await client.setDeviceDetails(deviceId, { display_name: displayName })
}

// ─── Ignored Users (Blocklist) ──────────────────────────────────────

export function getIgnoredUsers(client: MatrixClient): string[] {
  return client.getIgnoredUsers() ?? []
}

export async function ignoreUser(
  client: MatrixClient,
  userId: string,
): Promise<void> {
  const current = client.getIgnoredUsers() ?? []
  if (!current.includes(userId)) {
    await client.setIgnoredUsers([...current, userId])
  }
}

export async function unignoreUser(
  client: MatrixClient,
  userId: string,
): Promise<void> {
  const current = client.getIgnoredUsers() ?? []
  await client.setIgnoredUsers(current.filter(id => id !== userId))
}
