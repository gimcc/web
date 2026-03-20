import type { MatrixClient, MatrixEvent } from 'matrix-js-sdk'

export interface AccountDataEntry {
  type: string
  content: Record<string, unknown>
}

interface ClientStore {
  accountData?: Map<string, MatrixEvent>
}

interface RoomWithAccountData {
  accountData?: Map<string, MatrixEvent>
}

/**
 * Get all global account data entries.
 */
export function getAccountData(client: MatrixClient): AccountDataEntry[] {
  const store = (client as unknown as { store?: ClientStore }).store
  if (!store?.accountData)
    return []

  const entries: AccountDataEntry[] = []

  for (const [type, event] of store.accountData) {
    entries.push({
      type,
      content: event.getContent?.() ?? {},
    })
  }

  return entries.sort((a, b) => a.type.localeCompare(b.type))
}

/**
 * Get a single global account data entry.
 */
export function getAccountDataByType(
  client: MatrixClient,
  type: string,
): Record<string, unknown> | null {
  // Dynamic event types require casting; the SDK constrains to known event type keys.
  const getAccountDataFn = client.getAccountData.bind(client) as (t: string) => MatrixEvent | undefined
  const event = getAccountDataFn(type)
  if (!event)
    return null
  return event.getContent() ?? null
}

/**
 * Set global account data.
 */
export async function setAccountData(
  client: MatrixClient,
  type: string,
  content: Record<string, unknown>,
): Promise<void> {
  // Dynamic event types require casting; the SDK constrains to known event type keys.
  const setAccountDataFn = client.setAccountData.bind(client) as (t: string, c: Record<string, unknown>) => Promise<unknown>
  await setAccountDataFn(type, content)
}

/**
 * Get all room account data entries for a room.
 */
export function getRoomAccountData(
  client: MatrixClient,
  roomId: string,
): AccountDataEntry[] {
  const room = client.getRoom(roomId)
  if (!room)
    return []

  const entries: AccountDataEntry[] = []
  const data = (room as unknown as RoomWithAccountData).accountData

  if (data) {
    for (const [type, event] of data) {
      entries.push({
        type,
        content: event.getContent?.() ?? {},
      })
    }
  }

  return entries.sort((a, b) => a.type.localeCompare(b.type))
}

/**
 * Set room account data.
 */
export async function setRoomAccountData(
  client: MatrixClient,
  roomId: string,
  type: string,
  content: Record<string, unknown>,
): Promise<void> {
  // Dynamic event types require casting; the SDK constrains to known event type keys.
  const setRoomAccountDataFn = client.setRoomAccountData.bind(client) as (r: string, t: string, c: Record<string, unknown>) => Promise<unknown>
  await setRoomAccountDataFn(roomId, type, content)
}
