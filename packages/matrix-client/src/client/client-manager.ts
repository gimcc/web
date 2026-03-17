import type { MatrixClient, Room } from 'matrix-js-sdk'
import type { AuthSession } from '../auth/auth-service'
import type { RoomSummary } from '../stores/rooms-store'
import { ClientEvent, createClient, NotificationCountType } from 'matrix-js-sdk'
import { useConnectionStore } from '../stores/connection-store'
import { useRoomsStore } from '../stores/rooms-store'
import { createSyncBridge } from '../sync/sync-bridge'

let matrixClient: MatrixClient | null = null
let cleanupBridge: (() => void) | null = null

export function getMatrixClient(): MatrixClient | null {
  return matrixClient
}

export interface StartClientOptions {
  session: AuthSession
  onQueryInvalidation?: (event: string, roomId?: string) => void
}

export async function startMatrixClient(options: StartClientOptions): Promise<MatrixClient> {
  const { session, onQueryInvalidation } = options
  const connectionStore = useConnectionStore.getState()

  if (matrixClient) {
    await stopMatrixClient()
  }

  connectionStore.setStatus('connecting')

  try {
    const client = createClient({
      baseUrl: session.homeserverUrl,
      accessToken: session.accessToken,
      userId: session.userId,
      deviceId: session.deviceId,
      timelineSupport: true,
    })

    matrixClient = client

    // Set up sync bridge before starting client
    cleanupBridge = createSyncBridge(client, onQueryInvalidation)

    // Listen for sync state changes
    client.on(ClientEvent.Sync, (state, _prevState, data) => {
      const store = useConnectionStore.getState()

      switch (state) {
        case 'PREPARED':
        case 'SYNCING':
          store.setStatus('syncing')
          store.setLastSync(Date.now())
          break
        case 'RECONNECTING':
          store.setStatus('reconnecting')
          break
        case 'ERROR':
          store.setStatus('error', (data as { error?: Error })?.error?.message ?? 'Sync error')
          break
        case 'STOPPED':
          store.setStatus('disconnected')
          break
      }
    })

    // Start sync
    await client.startClient({ initialSyncLimit: 20 })

    return client
  }
  catch (err) {
    connectionStore.setStatus('error', err instanceof Error ? err.message : 'Failed to connect')
    throw err
  }
}

export async function stopMatrixClient(): Promise<void> {
  if (cleanupBridge) {
    cleanupBridge()
    cleanupBridge = null
  }

  if (matrixClient) {
    matrixClient.stopClient()
    matrixClient.removeAllListeners()
    matrixClient = null
  }

  useConnectionStore.getState().reset()
  useRoomsStore.getState().reset()
}

export function extractRoomSummaryFromClient(client: MatrixClient): RoomSummary[] {
  return client.getRooms().map(room => extractSingleRoomSummary(client, room))
}

export function extractSingleRoomSummary(client: MatrixClient, room: Room): RoomSummary {
  const lastEvent = room.timeline.at(-1)
  const dmUserId = room.getDMInviter() ?? guessDmUserId(room, client.getUserId() ?? '')

  return {
    roomId: room.roomId,
    name: room.name ?? room.roomId,
    topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic ?? null,
    avatarUrl: room.getAvatarUrl(client.baseUrl, 48, 48, 'crop') ?? null,
    isDirect: !!dmUserId,
    memberCount: room.getJoinedMemberCount(),
    lastMessage: lastEvent
      ? {
          senderId: lastEvent.getSender() ?? '',
          body: lastEvent.getContent()?.body ?? '',
          timestamp: lastEvent.getTs(),
          type: lastEvent.getType(),
        }
      : null,
    unreadCount: room.getUnreadNotificationCount(NotificationCountType.Total),
    highlightCount: room.getUnreadNotificationCount(NotificationCountType.Highlight),
    timestamp: lastEvent?.getTs() ?? 0,
  }
}

function guessDmUserId(room: { getJoinedMembers: () => Array<{ userId: string }> }, myUserId: string): string | null {
  const members = room.getJoinedMembers()
  if (members.length === 2) {
    const other = members.find(m => m.userId !== myUserId)
    return other?.userId ?? null
  }
  return null
}
