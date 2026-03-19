import type { MatrixClient, MatrixEvent, Room, RoomMember } from 'matrix-js-sdk'
import { ClientEvent, NotificationCountType, RoomEvent, RoomMemberEvent } from 'matrix-js-sdk'
import { extractRoomSummaryFromClient, extractSingleRoomSummary } from '../client/client-manager'
import { matrixEventToTimelineMessage } from '../services/message-service'
import { syncRoomReceipts } from '../services/receipt-service'
import { handleThreadEvent } from '../services/thread-service'
import { useMessagesStore } from '../stores/messages-store'
import { useRoomsStore } from '../stores/rooms-store'
import { useThreadsStore } from '../stores/threads-store'

export type QueryInvalidationCallback = (event: string, roomId?: string) => void

export function createSyncBridge(
  client: MatrixClient,
  onQueryInvalidation?: QueryInvalidationCallback,
): () => void {
  // Sync initial room list when sync is prepared
  function onSync(state: string): void {
    if (state === 'PREPARED') {
      syncRoomList(client)
      // Sync read receipts for all joined rooms
      const rooms = client.getRooms()
      for (const room of rooms) {
        syncRoomReceipts(room)
      }
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
      const content = event.getContent()
      const relatesTo = content['m.relates_to']

      // Handle message edit (m.replace)
      if (relatesTo?.rel_type === 'm.replace' && relatesTo.event_id) {
        const newContent = content['m.new_content']
        if (newContent) {
          useMessagesStore.getState().updateMessage(room.roomId, relatesTo.event_id, {
            body: newContent.body ?? '',
            formattedBody: newContent.formatted_body,
            edited: true,
            editedAt: event.getTs(),
          })
        }
      }
      // Handle thread messages
      else if (relatesTo?.rel_type === 'm.thread' && relatesTo.event_id) {
        const threadRootId = relatesTo.event_id as string
        const message = matrixEventToTimelineMessage(event, client)
        message.threadRootId = threadRootId
        const existing = useThreadsStore.getState().threads.get(threadRootId)
        const isEcho = existing?.some(m => m.eventId === message.eventId)
        useThreadsStore.getState().appendThreadMessage(threadRootId, message)
        // Only increment reply count if this is a genuinely new message (not an echo of our optimistic send)
        if (!isEcho) {
          handleThreadEvent(room.roomId, threadRootId)
        }
      }
      else {
        // Skip server echo of our own sent messages — the optimistic update
        // already added it and confirmMessage() will reconcile the event ID.
        const sender = event.getSender()
        const myUserId = client.getUserId()
        if (sender === myUserId) {
          const store = useMessagesStore.getState()
          const timeline = store.getTimeline(room.roomId)
          const eventId = event.getId()
          const hasPending = timeline.some(
            m => m.eventId === eventId || (m.status === 'sending' && m.senderId === myUserId),
          )
          if (hasPending) {
            return
          }
        }

        const message = matrixEventToTimelineMessage(event, client)
        useMessagesStore.getState().appendMessages(room.roomId, [message])
      }
    }

    // Handle reaction events
    if (event.getType() === 'm.reaction' && !event.isRedacted()) {
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

    // Handle redaction events (remove reactions + mark messages as redacted)
    if (event.getType() === 'm.room.redaction') {
      const redactedId = event.getAssociatedId()
      if (redactedId) {
        useMessagesStore.getState().removeReactionByEventId(room.roomId, redactedId)
        useMessagesStore.getState().redactMessage(room.roomId, redactedId)
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
    syncRoomReceipts(room)
    onQueryInvalidation?.('room.receipt', room.roomId)
  }

  // Room added
  function onRoom(): void {
    syncRoomList(client)
    onQueryInvalidation?.('room.list')
  }

  // My membership changes (join/invite/leave)
  function onMyMembership(room: Room, membership: string): void {
    if (membership === 'leave' || membership === 'ban') {
      useRoomsStore.getState().removeRoom(room.roomId)
      onQueryInvalidation?.('room.leave', room.roomId)
    }
    else if (membership === 'invite') {
      updateRoomFromEvent(client, room)
      onQueryInvalidation?.('room.invite', room.roomId)
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
