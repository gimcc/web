import type { MatrixClient } from 'matrix-js-sdk'

export interface AccountDataEntry {
  type: string
  content: Record<string, unknown>
}

/**
 * Get all global account data entries.
 */
export function getAccountData(client: MatrixClient): AccountDataEntry[] {
  const store = (client as any).store
  if (!store?.accountData)
    return []

  const entries: AccountDataEntry[] = []
  const data = store.accountData as Map<string, any>

  for (const [type, event] of data) {
    entries.push({
      type,
      content: event.getContent?.() ?? event.content ?? {},
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
  const event = client.getAccountData(type as any)
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
  await client.setAccountData(type as any, content as any)
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
  const data = (room as any).accountData as Map<string, any> | undefined

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
  await client.setRoomAccountData(roomId, type as any, content)
}
