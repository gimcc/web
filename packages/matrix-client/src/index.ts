// @matrix-web/matrix-client — Matrix SDK wrapper and state management

// Auth
export type { AuthCredentials, AuthSession } from './auth/auth-service'
export { useAuthStore } from './auth/auth-store'
export type { AuthState } from './auth/auth-store'

// Client lifecycle
export {
  getMatrixClient,
  startMatrixClient,
  stopMatrixClient,
} from './client/client-manager'
export type { StartClientOptions } from './client/client-manager'

// Mock client
export {
  getMockRooms,
  isMockActive,
  startMockClient,
  stopMockClient,
} from './client/mock-client'

// Query helpers
export {
  invalidateAll,
  invalidatePresence,
  invalidateRoomDetail,
  invalidateRoomList,
  invalidateRoomMembers,
  invalidateTimeline,
  queryKeys,
} from './query/query-keys'

// Stores
export { useConnectionStore } from './stores/connection-store'
export type { ConnectionState, ConnectionStatus } from './stores/connection-store'
export { useRoomsStore } from './stores/rooms-store'

export type { LastMessagePreview, RoomsState, RoomSummary } from './stores/rooms-store'
