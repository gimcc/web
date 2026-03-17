// @matrix-web/matrix-client — Matrix SDK wrapper and state management

// Auth
export type { AuthCredentials, AuthSession } from './auth/auth-service'
export { useAuthStore } from './auth/auth-store'
export type { AuthState } from './auth/auth-store'

// Client lifecycle
export {
  getMatrixClient,
  getPresenceService,
  getTypingService,
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

// Crypto — DEK manager
export {
  changePassword,
  clearAllLocalData,
  decrypt,
  deriveKek,
  encrypt,
  exportDek,
  generateDek,
  generateSalt,
  hasDekStored,
  hashPassword,
  hasPasswordSet,
  importDek,
  loadDekPlaintext,
  loadDekWithPassword,
  persistDekEncrypted,
  persistDekPlaintext,
  removePassword,
  setPassword,
  verifyPassword,
} from './crypto/dek-manager'

// Crypto — duress password
export {
  changeDuressPassword,
  clearDuressData,
  hasDuressPassword,
  removeDuressPassword,
  setDuressPassword,
  verifyDuressPassword,
} from './crypto/duress-manager'

// Crypto — password verification
export { hasNormalPassword, verifyPasswordInput } from './crypto/password-verifier'
export type { VerificationResult } from './crypto/password-verifier'

// Crypto — wipe service
export { silentWipe } from './crypto/wipe-service'

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

// Services
export {
  loadInitialTimeline,
  loadRoomHistory,
  matrixEventToTimelineMessage,
  resendMessage,
  sendTextMessage,
} from './services/message-service'
export {
  addMockReactions,
  loadMockTimeline,
  sendMockMessage,
  toggleMockReaction,
  uploadMockFile,
} from './services/mock-message-service'
export type { PresenceService } from './services/presence-service'
export {
  redactReaction,
  sendReaction,
  toggleReaction,
} from './services/reaction-service'
export type { TypingService } from './services/typing-service'
export {
  mxcToHttpUrl,
  mxcToThumbnailUrl,
  uploadAndSendFile,
} from './services/upload-service'
export type { UploadOptions, UploadResult } from './services/upload-service'

// Stores
export { useConnectionStore } from './stores/connection-store'
export type { ConnectionState, ConnectionStatus } from './stores/connection-store'
export { useCryptoStore } from './stores/crypto-store'
export type { CryptoState, KeyBackupProgress } from './stores/crypto-store'
export { useLockStore } from './stores/lock-store'
export type { LockState } from './stores/lock-store'
export { useMessagesStore } from './stores/messages-store'
export type { MessagesState, MessageStatus, Reaction, TimelineMessage } from './stores/messages-store'
export { usePresenceStore } from './stores/presence-store'
export type { PresenceInfo, PresenceState, PresenceStatus } from './stores/presence-store'
export { useRoomsStore } from './stores/rooms-store'
export type { LastMessagePreview, RoomsState, RoomSummary } from './stores/rooms-store'
export { useTypingStore } from './stores/typing-store'
export type { TypingState } from './stores/typing-store'

// Sync bridges
export { createCryptoBridge } from './sync/crypto-bridge'

// Utils
export {
  formatUserId,
  parseUserId,
  resolveUserId,
} from './utils/user-id'
export type { ParsedUserId } from './utils/user-id'

// Re-export crypto verification types for UI consumers
export type {
  ShowSasCallbacks,
  VerificationRequest,
} from 'matrix-js-sdk/lib/crypto-api'
export { VerifierEvent } from 'matrix-js-sdk/lib/crypto-api'
