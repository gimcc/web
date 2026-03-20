import type { MatrixClient } from 'matrix-js-sdk'

/**
 * Report an event (message) to the server admin.
 * The server will forward the report to the room admin/server admin.
 */
export async function reportEvent(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  reason: string,
  score: number = -100,
): Promise<void> {
  await client.reportEvent(roomId, eventId, score, reason)
}
