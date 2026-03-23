import type { Room } from 'matrix-js-sdk'
import type { ReceiptInfo } from '../stores/receipts-store'
import { ReceiptType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useReceiptsStore } from '../stores/receipts-store'

/**
 * Send a read receipt for the given event in a room.
 * @param roomId - The room ID
 * @param eventId - The event ID to mark as read
 * @param receiptType - 'm.read' for public or 'm.read.private' for private (hidden from other users)
 */
export async function sendReadReceipt(
  roomId: string,
  eventId: string,
  receiptType: ReceiptType.Read | ReceiptType.ReadPrivate = ReceiptType.Read,
): Promise<void> {
  const client = getMatrixClient()
  if (!client)
    return

  const room = client.getRoom(roomId)
  if (!room)
    return

  const event = room.findEventById(eventId)
  if (!event)
    return

  try {
    await client.sendReadReceipt(event, receiptType)
  }
  catch {
    // Silently ignore receipt send failures
  }
}

/**
 * Extract all read receipts for a room from the Matrix SDK and populate the store.
 */
export function syncRoomReceipts(room: Room): void {
  const client = getMatrixClient()
  if (!client)
    return

  const myUserId = client.getUserId() ?? ''
  const timeline = room.getLiveTimeline()
  const events = timeline.getEvents()

  const userReceipts = new Map<string, ReceiptInfo>()

  // Iterate events in reverse to find each user's latest read position
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!
    const eventId = event.getId()
    if (!eventId)
      continue

    // Check both public and private receipt types
    for (const type of [ReceiptType.Read, ReceiptType.ReadPrivate]) {
      const receipts = room.getReceiptsForEvent(event)
      if (!receipts || receipts.length === 0)
        continue

      for (const receipt of receipts) {
        const userId = receipt.userId
        // Skip own receipts
        if (userId === myUserId)
          continue
        // Skip if we already have a newer receipt for this user
        if (userReceipts.has(userId))
          continue

        const member = room.getMember(userId)
        userReceipts.set(userId, {
          userId,
          userName: member?.name ?? userId,
          eventId,
          ts: receipt.data?.ts ?? 0,
          isPrivate: type === ReceiptType.ReadPrivate,
        })
      }
    }
  }

  useReceiptsStore.getState().setReceipts(room.roomId, userReceipts)
}
