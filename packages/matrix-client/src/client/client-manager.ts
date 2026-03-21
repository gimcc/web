import type { MatrixClient, Room } from 'matrix-js-sdk'
import type { AuthSession } from '../auth/auth-service'
import type { PresenceService } from '../services/presence-service'
import type { TypingService } from '../services/typing-service'
import type { RoomSummary } from '../stores/rooms-store'
import { ClientEvent, createClient, NotificationCountType } from 'matrix-js-sdk'
import { createPresenceService } from '../services/presence-service'
import { createTypingService } from '../services/typing-service'
import { useConnectionStore } from '../stores/connection-store'
import { useCryptoStore } from '../stores/crypto-store'
import { usePresenceStore } from '../stores/presence-store'
import { useRoomsStore } from '../stores/rooms-store'
import { useTimelineStore } from '../stores/timeline-store'
import { useTypingStore } from '../stores/typing-store'
import { cacheSecretStorageKey, getSecretStorageKey } from '../services/secret-storage-service'
import { createCryptoBridge } from '../sync/crypto-bridge'
import { createPresenceBridge } from '../sync/presence-bridge'
import { createSyncBridge } from '../sync/sync-bridge'
import { createTypingBridge } from '../sync/typing-bridge'
import { clearCryptoStoreAsync } from '../utils/clear-crypto-store'

let matrixClient: MatrixClient | null = null
let cleanupBridge: (() => void) | null = null
let cleanupCryptoBridge: (() => void) | null = null
let cleanupTypingBridge: (() => void) | null = null
let cleanupPresenceBridge: (() => void) | null = null
let typingService: TypingService | null = null
let presenceService: PresenceService | null = null

export function getMatrixClient(): MatrixClient | null {
  return matrixClient
}

export function getTypingService(): TypingService | null {
  return typingService
}

export function getPresenceService(): PresenceService | null {
  return presenceService
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
      cryptoCallbacks: {
        getSecretStorageKey,
        cacheSecretStorageKey,
      },
    })

    matrixClient = client

    // Initialize Rust crypto (E2EE via WASM)
    try {
      await client.initRustCrypto()
      useCryptoStore.getState().setInitialized(true)
      cleanupCryptoBridge = createCryptoBridge(client)
    }
    catch (err) {
      // Device ID mismatch: crypto store has stale data from a previous session.
      // Clear the crypto IndexedDB and retry once before giving up.
      if (isDeviceMismatchError(err)) {
        console.warn('Crypto store device mismatch — clearing stale data and retrying…')
        try {
          await clearCryptoStoreAsync()
          await client.initRustCrypto()
          useCryptoStore.getState().setInitialized(true)
          cleanupCryptoBridge = createCryptoBridge(client)
        }
        catch (retryErr) {
          console.warn('Failed to initialize Rust crypto after retry — E2EE disabled:', retryErr)
          useCryptoStore.getState().setInitialized(false)
        }
      }
      else {
        console.warn('Failed to initialize Rust crypto — E2EE disabled:', err)
        useCryptoStore.getState().setInitialized(false)
      }
    }

    // Set up sync bridges
    cleanupBridge = createSyncBridge(client, onQueryInvalidation)
    cleanupTypingBridge = createTypingBridge(client)
    cleanupPresenceBridge = createPresenceBridge(client)

    // Create typing and presence services
    typingService = createTypingService(client)
    presenceService = createPresenceService(client)

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
  if (typingService) {
    typingService.dispose()
    typingService = null
  }

  if (presenceService) {
    presenceService.setOffline()
    presenceService.dispose()
    presenceService = null
  }

  if (cleanupCryptoBridge) {
    cleanupCryptoBridge()
    cleanupCryptoBridge = null
  }

  if (cleanupTypingBridge) {
    cleanupTypingBridge()
    cleanupTypingBridge = null
  }

  if (cleanupPresenceBridge) {
    cleanupPresenceBridge()
    cleanupPresenceBridge = null
  }

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
  useCryptoStore.getState().reset()
  useRoomsStore.getState().reset()
  useTimelineStore.getState().reset()
  useTypingStore.getState().reset()
  usePresenceStore.getState().reset()
}

const VISIBLE_MEMBERSHIPS = new Set(['join', 'invite'])

export function extractRoomSummaryFromClient(client: MatrixClient): RoomSummary[] {
  return client.getRooms()
    .filter(room => VISIBLE_MEMBERSHIPS.has(room.getMyMembership()))
    .map(room => extractSingleRoomSummary(client, room))
}

export function extractSingleRoomSummary(client: MatrixClient, room: Room): RoomSummary {
  const lastEvent = room.timeline.at(-1)
  const dmUserId = room.getDMInviter() ?? guessDmUserId(room, client.getUserId() ?? '')

  return {
    roomId: room.roomId,
    name: room.name ?? room.roomId,
    topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic ?? null,
    avatarUrl: room.getAvatarUrl(client.baseUrl, 48, 48, 'crop') ?? null,
    isEncrypted: room.hasEncryptionStateEvent(),
    isDirect: !!dmUserId,
    membership: room.getMyMembership() === 'invite' ? 'invite' : 'join',
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

function isDeviceMismatchError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('account in the store doesn\'t match the account in the constructor')
  }
  return false
}
