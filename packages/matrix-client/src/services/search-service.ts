import type { MatrixClient } from 'matrix-js-sdk'

export interface SearchResult {
  eventId: string
  roomId: string
  senderId: string
  senderName: string
  body: string
  timestamp: number
}

export async function searchMessages(
  client: MatrixClient,
  roomId: string,
  query: string,
): Promise<SearchResult[]> {
  if (!query.trim())
    return []

  try {
    const response = await client.searchRoomEvents({
      term: query,
      filter: { rooms: [roomId] },
    })

    return (response.results ?? []).map((result: any) => {
      const event = result.result
      const room = client.getRoom(event.room_id)
      const member = room?.getMember(event.sender)
      return {
        eventId: event.event_id,
        roomId: event.room_id,
        senderId: event.sender,
        senderName: member?.name ?? event.sender,
        body: event.content?.body ?? '',
        timestamp: event.origin_server_ts,
      }
    })
  }
  catch {
    return []
  }
}
