import type { MatrixClient, MatrixEvent, Room, RoomMember } from 'matrix-js-sdk'
import { ClientEvent, NotificationCountType, RoomEvent, RoomMemberEvent } from 'matrix-js-sdk'
import { extractRoomSummaryFromClient, extractSingleRoomSummary } from '../client/client-manager'
import { matrixEventToTimelineMessage } from '../services/message-service'
import { useMessagesStore } from '../stores/messages-store'
import { useRoomsStore } from '../stores/rooms-store'

export type QueryInvalidationCallback = (event: string, roomId?: string) => void

export function createSyncBridge(
  client: MatrixClient,
  onQueryInvalidation?: QueryInvalidationCallback,
): () => void {
  // Sync initial room list when sync is prepared
  function onSync(state: string): void {
    if (state === 'PREPARED') {
      syncRoomList(client)
      onQueryInvalidation?.('sync.prepared')
    }
  }

  // Room timeline events (new messages)
  function onTimeline(event: MatrixEvent, room: Room | undefined): void {
    if (!room)
      return
    updateRoomFromEvent(client, room)

    // Append message to messages store if it's a room message
    if (event.getType() === 'm.room.message') {
      const message = matrixEventToTimelineMessage(event, client)
      useMessagesStore.getState().appendMessages(room.roomId, [message])
    }

    // Handle reaction events
    if (event.getType() === 'm.reaction') {
      const content = event.getContent()
      const relatesTo = content['m.relates_to']
      if (relatesTo?.rel_type === 'm.annotation' && relatesTo.event_id && relatesTo.key) {
        const senderId = event.getSender() ?? ''
        const reactionEventId = event.getId() ?? ''
        useMessagesStore.getState().addReaction(
          room.roomId,
          relatesTo.event_id,
          relatesTo.key,
          senderId,
          reactionEventId,
        )
      }
    }

    onQueryInvalidation?.('room.timeline', room.roomId)
  }

  // Room name changes
  function onRoomName(room: Room): void {
    updateRoomFromEvent(client, room)
    onQueryInvalidation?.('room.name', room.roomId)
  }

  // Room membership changes
  function onMembership(_event: MatrixEvent, member: RoomMember): void {
    const room = client.getRoom(member.roomId)
    if (room) {
      updateRoomFromEvent(client, room)
      onQueryInvalidation?.('room.membership', member.roomId)
    }
  }

  // Room receipt (read markers)
  function onReceipt(_event: MatrixEvent, room: Room): void {
    updateRoomUnread(room)
    onQueryInvalidation?.('room.receipt', room.roomId)
  }

  // Room added
  function onRoom(): void {
    syncRoomList(client)
    onQueryInvalidation?.('room.list')
  }

  // My membership changes (join/leave)
  function onMyMembership(room: Room, membership: string): void {
    if (membership === 'leave' || membership === 'ban') {
      useRoomsStore.getState().removeRoom(room.roomId)
      onQueryInvalidation?.('room.leave', room.roomId)
    }
    else {
      syncRoomList(client)
      onQueryInvalidation?.('room.join')
    }
  }

  client.on(ClientEvent.Sync, onSync)
  client.on(RoomEvent.Timeline, onTimeline)
  client.on(RoomEvent.Name, onRoomName)
  client.on(RoomMemberEvent.Membership, onMembership)
  client.on(RoomEvent.Receipt, onReceipt)
  client.on(ClientEvent.Room, onRoom)
  client.on(RoomEvent.MyMembership, onMyMembership)

  return () => {
    client.removeListener(ClientEvent.Sync, onSync)
    client.removeListener(RoomEvent.Timeline, onTimeline)
    client.removeListener(RoomEvent.Name, onRoomName)
    client.removeListener(RoomMemberEvent.Membership, onMembership)
    client.removeListener(RoomEvent.Receipt, onReceipt)
    client.removeListener(ClientEvent.Room, onRoom)
    client.removeListener(RoomEvent.MyMembership, onMyMembership)
  }
}

function syncRoomList(client: MatrixClient): void {
  const summaries = extractRoomSummaryFromClient(client)
  useRoomsStore.getState().setRooms(summaries)
}

function updateRoomFromEvent(client: MatrixClient, room: Room): void {
  const updated = extractSingleRoomSummary(client, room)
  useRoomsStore.getState().upsertRoom(updated)
}

function updateRoomUnread(room: Room): void {
  const unread = room.getUnreadNotificationCount(NotificationCountType.Total)
  const highlight = room.getUnreadNotificationCount(NotificationCountType.Highlight)
  useRoomsStore.getState().updateUnreadCount(room.roomId, unread, highlight)
}
