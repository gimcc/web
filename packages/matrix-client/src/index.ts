// @matrix-web/matrix-client — Matrix SDK wrapper and state management

// Auth
export type { AuthCredentials, AuthSession } from './auth/auth-service'
export { useAuthStore } from './auth/auth-store'
export type { AuthState } from './auth/auth-store'

// Auth — password reset
export {
  checkEmailValidation,
  generateClientSecret,
  requestPasswordResetEmail,
  submitNewPassword,
} from './auth/password-reset-service'

// Auth — SSO
export {
  buildSsoRedirectUrl,
  getLoginFlows,
  startSsoLogin,
} from './auth/sso-service'
export type { LoginFlowsResult, SsoIdentityProvider } from './auth/sso-service'

// Auth — UIA
export {
  buildDummyAuth,
  buildPasswordAuth,
  extractUiaChallenge,
  getRemainingStages,
  isUiaChallenge,
} from './auth/uia-service'
export type { UiaAuth, UiaChallenge, UiaDummyAuth, UiaPasswordAuth, UiaStage } from './auth/uia-service'

// Auth — well-known discovery
export { discoverHomeserver, isDomainInput } from './auth/well-known-service'
export type { WellKnownResult } from './auth/well-known-service'

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

// Crypto — E2EE service
export {
  bootstrapCrossSigning,
  bootstrapSecretStorage,
  checkAndEnableKeyBackup,
  createKeyBackup,
  createRecoveryKey,
  crossSignDevice,
  disableKeyStorage,
  getActiveBackupVersion,
  getCrossSigningInfo,
  getDeviceTrust,
  getInProgressVerifications,
  getSecretStorageInfo,
  getUserTrust,
  isRoomEncrypted,
  loadBackupKeyFromSecretStorage,
  pinUserIdentity,
  requestDeviceVerification,
  requestSelfVerification,
  requestUserVerificationDM,
  resetEncryption,
  setDeviceVerified,
} from './services/crypto-service'
export type {
  CrossSigningInfo,
  DeviceTrustInfo,
  SecretStorageInfo,
  UserTrustInfo,
} from './services/crypto-service'

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

// Services — account data
export {
  getAccountData,
  getAccountDataByType,
  getRoomAccountData,
  setAccountData,
  setRoomAccountData,
} from './services/account-data-service'
export type { AccountDataEntry } from './services/account-data-service'

// Services — account (3PID, devices, ignored users)
export {
  addThreePid,
  deleteDevice,
  deleteThreePid,
  getDevices,
  getIgnoredUsers,
  getThreePids,
  ignoreUser,
  renameDevice,
  requestEmailToken,
  requestMsisdnToken,
  unignoreUser,
} from './services/account-service'
export type { DeviceInfo, ThreePid } from './services/account-service'

// Services — custom emoji
export {
  getAllEmojiPacks,
  getRoomEmojiPacks,
  getStickerMxcUrl,
  getStickerPacks,
  getUserEmojiPacks,
} from './services/custom-emoji-service'
export type {
  EmojiPackContent,
  EmojiPackImage,
  ResolvedEmojiPack,
} from './services/custom-emoji-service'
// Services — join rules
export { getRoomJoinRule, setRoomJoinRule } from './services/join-rules-service'
export type { JoinRule } from './services/join-rules-service'
// Services — members
export {
  banUser,
  getMyPowerLevel,
  getRoomMembers,
  inviteUser,
  kickUser,
  unbanUser,
} from './services/member-service'
export type { RoomMemberInfo } from './services/member-service'
// Services — messages
export {
  deleteMessage,
  editMessage,
  loadInitialTimeline,
  loadRoomHistory,
  matrixEventToTimelineMessage,
  resendMessage,
  sendReply,
  sendTextMessage,
} from './services/message-service'
export {
  addMockReactions,
  loadMockTimeline,
  sendMockMessage,
  toggleMockReaction,
  uploadMockFile,
} from './services/mock-message-service'
export {
  createMockDmRoom,
  createMockGroupRoom,
  getMockKnownUsers,
  searchMockUsers,
} from './services/mock-room-service'
// Services — notification inbox
export { getNotifications, markRoomNotificationsRead } from './services/notification-inbox-service'
export type { NotificationItem } from './services/notification-inbox-service'
// Services — notification levels
export { getRoomNotificationLevel, setRoomNotificationLevel } from './services/notification-level-service'
export type { RoomNotificationLevel } from './services/notification-level-service'
// Services — permissions
export {
  getRoomPowerLevels,
  setUserPowerLevel,
  updatePowerLevels,
} from './services/permission-service'
export type { PowerLevels } from './services/permission-service'
// Services — pins
export {
  getPinnedEventIds,
  getPinnedMessages,
  pinMessage,
  unpinMessage,
} from './services/pin-service'
export type { PresenceService } from './services/presence-service'
// Services — profile
export {
  getMyProfile,
  getSharedRooms,
  getUserProfile,
  removeAvatar,
  setDisplayName,
  uploadAvatar,
} from './services/profile-service'
export type { UserProfile } from './services/profile-service'
// Services — push rules
export {
  addKeywordRule,
  getPushRules,
  removeKeywordRule,
  togglePushRule,
} from './services/push-rules-service'
export type { PushRule, PushRuleKind, PushRulesSet } from './services/push-rules-service'

export {
  redactReaction,
  sendReaction,
  toggleReaction,
} from './services/reaction-service'

// Services — receipts
export { sendReadReceipt, syncRoomReceipts } from './services/receipt-service'
// Services — report
export { reportEvent } from './services/report-service'
export {
  addRoomAlias,
  createDmRoom,
  createGroupRoom,
  createRoom,
  extractNewRoomSummary,
  getKnownUsers,
  getRoomAliases,
  joinRoom,
  leaveRoom,
  removeRoomAlias,
  searchPublicRooms,
  searchUsers,
  setCanonicalAlias,
  updateRoomName,
  updateRoomTopic,
} from './services/room-service'
export type { CreateDmOptions, CreateGroupOptions, CreateRoomOptions, KnownUser, UserSearchResult } from './services/room-service'
// Services — search
export { searchMessages } from './services/search-service'
export type { SearchResult } from './services/search-service'
// Services — sticker
export { sendSticker } from './services/sticker-service'

export type { SendStickerOptions } from './services/sticker-service'
export {
  handleThreadEvent,
  loadThreadTimeline,
  sendThreadMessage,
} from './services/thread-service'

// Services — tombstone
export { followTombstone, getRoomTombstone } from './services/tombstone-service'
export type { TombstoneInfo } from './services/tombstone-service'

export type { TypingService } from './services/typing-service'
export {
  mxcToHttpUrl,
  mxcToThumbnailUrl,
  resendUpload,
  uploadAndSendFile,
} from './services/upload-service'
export type { UploadOptions, UploadResult } from './services/upload-service'
// Services — URL preview
export { extractUrls, fetchUrlPreview } from './services/url-preview-service'
export type { UrlPreview } from './services/url-preview-service'

// Stores
export { useConnectionStore } from './stores/connection-store'
export type { ConnectionState, ConnectionStatus } from './stores/connection-store'

export { useCryptoStore } from './stores/crypto-store'
export type { CryptoState, KeyBackupProgress } from './stores/crypto-store'
export { useDraftsStore } from './stores/drafts-store'
export type { DraftsState } from './stores/drafts-store'
export { useLockStore } from './stores/lock-store'
export type { LockState } from './stores/lock-store'
export { useMessagesStore } from './stores/messages-store'
export type { MessagesState, MessageStatus, Reaction, ReplyTo, TimelineMessage } from './stores/messages-store'
export { usePresenceStore } from './stores/presence-store'
export type { PresenceInfo, PresenceState, PresenceStatus } from './stores/presence-store'
export { useReceiptsStore } from './stores/receipts-store'
export type { ReceiptInfo, ReceiptsState } from './stores/receipts-store'
export { useRoomsStore } from './stores/rooms-store'
export type { LastMessagePreview, RoomsState, RoomSummary } from './stores/rooms-store'
export { useThreadsStore } from './stores/threads-store'
export type { ThreadsState } from './stores/threads-store'
export { useTimelineStore } from './stores/timeline-store'
export type { OptimisticReaction, TimelineStoreState } from './stores/timeline-store'
export { useTypingStore } from './stores/typing-store'
export type { TypingState } from './stores/typing-store'
// Sync bridges
export { createCryptoBridge } from './sync/crypto-bridge'
// Timeline (new SDK-backed reading)
export { paginateBackward, readTimeline, roomHasMoreHistory } from './timeline/reader'

export type {
  DayDividerItem,
  TimelineItem,
  TimelineMemberItem,
  TimelineMessageItem,
  TimelineStateItem,
  UnreadDividerItem,
} from './timeline/types'

// Utils — matrix.to links
export {
  buildMatrixToUrl,
  isMatrixToUrl,
  isRoomIdentifier,
  isUserIdentifier,
  parseMatrixToUrl,
} from './utils/matrix-link'
export type { MatrixLink, MatrixLinkType } from './utils/matrix-link'

// Utils
export {
  formatUserId,
  parseUserId,
  resolveUserId,
} from './utils/user-id'
export type { ParsedUserId } from './utils/user-id'

// Re-export crypto verification types for UI consumers
export type {
  ShowQrCodeCallbacks,
  ShowSasCallbacks,
  VerificationRequest,
} from 'matrix-js-sdk/lib/crypto-api'
export {
  VerificationPhase,
  VerificationRequestEvent,
  VerifierEvent,
} from 'matrix-js-sdk/lib/crypto-api'

export type {
  CreateSecretStorageOpts,
  GeneratedSecretStorageKey,
} from 'matrix-js-sdk/lib/crypto-api'

export {
  decodeRecoveryKey,
  encodeRecoveryKey,
} from 'matrix-js-sdk/lib/crypto-api/recovery-key'
