import type { MatrixClient, MatrixEvent, Room, RoomMember } from 'matrix-js-sdk'
import { ClientEvent, MatrixEventEvent, NotificationCountType, RoomEvent, RoomMemberEvent } from 'matrix-js-sdk'
import { extractRoomSummaryFromClient, extractSingleRoomSummary } from '../client/client-manager'
import { syncRoomReceipts } from '../services/receipt-service'
import { handleThreadEvent } from '../services/thread-service'
import { useRoomsStore } from '../stores/rooms-store'
import { useTimelineStore } from '../stores/timeline-store'
import { useThreadsStore } from '../stores/threads-store'
import { matrixEventToTimelineMessage } from '../services/message-service'
import { roomHasMoreHistory } from '../timeline/reader'

export type QueryInvalidationCallback = (event: string, roomId?: string) => void

export function createSyncBridge(
  client: MatrixClient,
  onQueryInvalidation?: QueryInvalidationCallback,
): () => void {
  const timelineStore = useTimelineStore.getState

  // -----------------------------------------------------------------------
  // Sync state
  // -----------------------------------------------------------------------
  function onSync(state: string): void {
    if (state === 'PREPARED') {
      syncRoomList(client)
      const rooms = client.getRooms()
      for (const room of rooms) {
        syncRoomReceipts(room)
      }

      // Set hasMore for the active room now that SDK has timeline data
      const activeRoomId = useRoomsStore.getState().activeRoomId
      if (activeRoomId) {
        const hasMore = roomHasMoreHistory(client, activeRoomId)
        timelineStore().setHasMore(activeRoomId, hasMore)
        timelineStore().bumpVersion(activeRoomId)
      }

      onQueryInvalidation?.('sync.prepared')
    }
  }

  // -----------------------------------------------------------------------
  // Timeline events — the core message processing
  // -----------------------------------------------------------------------
  function processTimelineEvent(event: MatrixEvent, room: Room): void {
    const type = event.getType()
    const roomId = room.roomId

    // Handle thread messages → route to threads store
    if (type === 'm.room.message') {
      const content = event.getContent()
      const relatesTo = content['m.relates_to']

      if (relatesTo?.rel_type === 'm.thread' && relatesTo.event_id) {
        const threadRootId = relatesTo.event_id as string
        const message = matrixEventToTimelineMessage(event, client)
        message.threadRootId = threadRootId
        const existing = useThreadsStore.getState().threads.get(threadRootId)
        const isEcho = existing?.some(m => m.eventId === message.eventId)
        useThreadsStore.getState().appendThreadMessage(threadRootId, message)
        if (!isEcho) {
          handleThreadEvent(roomId, threadRootId)
        }
        // Still bump version so thread reply count is visible in main timeline
        timelineStore().bumpVersion(roomId)
        return
      }

      // Confirm optimistic message if this is our own event
      const sender = event.getSender()
      const myUserId = client.getUserId()
      const eventId = event.getId()
      if (sender === myUserId && eventId) {
        const optimistic = timelineStore().optimistic.get(roomId) ?? []
        const echoBody = content.body ?? ''

        // Match by body content first (handles out-of-order echoes), fallback to FIFO
        const pending = optimistic.find(
          m => m.eventId.startsWith('~') && m.senderId === myUserId && m.status === 'sending' && m.body === echoBody,
        ) ?? optimistic.find(
          m => m.eventId.startsWith('~') && m.senderId === myUserId && m.status === 'sending',
        )
        if (pending) {
          timelineStore().confirmOptimistic(roomId, pending.eventId, eventId)
          return // confirmOptimistic already bumps version
        }
      }
    }

    // For all other events (messages from others, reactions, redactions,
    // member events, state events, stickers, etc.) — just bump version.
    // The reader will pick them up from SDK on next render.
    timelineStore().bumpVersion(roomId)
  }

  function onTimeline(event: MatrixEvent, room: Room | undefined, toStartOfTimeline: boolean | undefined): void {
    if (!room) return

    // Ignore historical events from pagination/scrollback
    if (toStartOfTimeline) return

    updateRoomFromEvent(client, room)

    const type = event.getType()

    // Encrypted events: wait for decryption to complete
    if (type === 'm.room.encrypted') {
      event.once(MatrixEventEvent.Decrypted, () => {
        processTimelineEvent(event, room)
      })
      return
    }

    processTimelineEvent(event, room)
  }

  // -----------------------------------------------------------------------
  // Timeline refresh — SDK resets timeline (sync gaps, limited timeline)
  // -----------------------------------------------------------------------
  function onTimelineRefresh(room: Room): void {
    const hasMore = roomHasMoreHistory(client, room.roomId)
    timelineStore().setHasMore(room.roomId, hasMore)
    timelineStore().bumpVersion(room.roomId)
  }

  // -----------------------------------------------------------------------
  // Room metadata events
  // -----------------------------------------------------------------------
  function onRoomName(room: Room): void {
    updateRoomFromEvent(client, room)
    onQueryInvalidation?.('room.name', room.roomId)
  }

  function onMembership(_event: MatrixEvent, member: RoomMember): void {
    const room = client.getRoom(member.roomId)
    if (room) {
      updateRoomFromEvent(client, room)
      onQueryInvalidation?.('room.membership', member.roomId)
    }
  }

  function onReceipt(_event: MatrixEvent, room: Room): void {
    updateRoomUnread(room)
    syncRoomReceipts(room)
    onQueryInvalidation?.('room.receipt', room.roomId)
  }

  function onRoom(): void {
    syncRoomList(client)
    onQueryInvalidation?.('room.list')
  }

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

  // -----------------------------------------------------------------------
  // Register all listeners
  // -----------------------------------------------------------------------
  client.on(ClientEvent.Sync, onSync)
  client.on(RoomEvent.Timeline, onTimeline)
  client.on(RoomEvent.TimelineRefresh as any, onTimelineRefresh)
  client.on(RoomEvent.Name, onRoomName)
  client.on(RoomMemberEvent.Membership, onMembership)
  client.on(RoomEvent.Receipt, onReceipt)
  client.on(ClientEvent.Room, onRoom)
  client.on(RoomEvent.MyMembership, onMyMembership)

  return () => {
    client.removeListener(ClientEvent.Sync, onSync)
    client.removeListener(RoomEvent.Timeline, onTimeline)
    client.removeListener(RoomEvent.TimelineRefresh as any, onTimelineRefresh)
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
