import type { MatrixClient } from 'matrix-js-sdk'
import type {
  BootstrapCrossSigningOpts,
  CreateSecretStorageOpts,
  CrossSigningStatus,
  DeviceVerificationStatus,
  GeneratedSecretStorageKey,
  UserVerificationStatus,
  VerificationRequest,
} from 'matrix-js-sdk/lib/crypto-api'

// ─── Types ──────────────────────────────────────────────────────────

export interface CrossSigningInfo {
  ready: boolean
  publicKeysOnDevice: boolean
  privateKeysInSecretStorage: boolean
  privateKeysCachedLocally: {
    masterKey: boolean
    selfSigningKey: boolean
    userSigningKey: boolean
  }
}

export interface SecretStorageInfo {
  ready: boolean
  defaultKeyId: string | null
}

export interface DeviceTrustInfo {
  verified: boolean
  signedByOwner: boolean
  crossSigningVerified: boolean
  localVerified: boolean
}

export interface UserTrustInfo {
  verified: boolean
  crossSigningVerified: boolean
  wasCrossSigningVerified: boolean
  needsUserApproval: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────

function getCryptoOrThrow(client: MatrixClient) {
  const crypto = client.getCrypto()
  if (!crypto) {
    throw new Error('Crypto is not initialized')
  }
  return crypto
}

// ─── Cross-Signing ──────────────────────────────────────────────────

export async function getCrossSigningInfo(client: MatrixClient): Promise<CrossSigningInfo> {
  const crypto = getCryptoOrThrow(client)
  const status: CrossSigningStatus = await crypto.getCrossSigningStatus()
  const ready = await crypto.isCrossSigningReady()

  return {
    ready,
    publicKeysOnDevice: status.publicKeysOnDevice,
    privateKeysInSecretStorage: status.privateKeysInSecretStorage,
    privateKeysCachedLocally: status.privateKeysCachedLocally,
  }
}

export async function bootstrapCrossSigning(
  client: MatrixClient,
  opts?: BootstrapCrossSigningOpts,
): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.bootstrapCrossSigning(opts ?? {})
}

// ─── Secret Storage (SSSS) ──────────────────────────────────────────

export async function getSecretStorageInfo(client: MatrixClient): Promise<SecretStorageInfo> {
  const crypto = getCryptoOrThrow(client)
  const status = await crypto.getSecretStorageStatus()

  return {
    ready: status.ready,
    defaultKeyId: status.defaultKeyId,
  }
}

export async function bootstrapSecretStorage(
  client: MatrixClient,
  opts: CreateSecretStorageOpts,
): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.bootstrapSecretStorage(opts)
}

// ─── Recovery Key ───────────────────────────────────────────────────

export async function createRecoveryKey(
  client: MatrixClient,
  passphrase?: string,
): Promise<GeneratedSecretStorageKey> {
  const crypto = getCryptoOrThrow(client)
  return crypto.createRecoveryKeyFromPassphrase(passphrase)
}

// ─── Key Backup ─────────────────────────────────────────────────────

export async function createKeyBackup(client: MatrixClient): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.resetKeyBackup()
}

export async function checkAndEnableKeyBackup(client: MatrixClient): Promise<boolean> {
  const crypto = getCryptoOrThrow(client)
  const info = await crypto.checkKeyBackupAndEnable()
  return info !== null
}

export async function getActiveBackupVersion(client: MatrixClient): Promise<string | null> {
  const crypto = getCryptoOrThrow(client)
  return crypto.getActiveSessionBackupVersion()
}

export async function disableKeyStorage(client: MatrixClient): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.disableKeyStorage()
}

export async function loadBackupKeyFromSecretStorage(client: MatrixClient): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.loadSessionBackupPrivateKeyFromSecretStorage()
}

// ─── Verification ───────────────────────────────────────────────────

export async function requestSelfVerification(client: MatrixClient): Promise<VerificationRequest> {
  const crypto = getCryptoOrThrow(client)
  return crypto.requestOwnUserVerification()
}

export async function requestDeviceVerification(
  client: MatrixClient,
  userId: string,
  deviceId: string,
): Promise<VerificationRequest> {
  const crypto = getCryptoOrThrow(client)
  return crypto.requestDeviceVerification(userId, deviceId)
}

export async function requestUserVerificationDM(
  client: MatrixClient,
  userId: string,
  roomId: string,
): Promise<VerificationRequest> {
  const crypto = getCryptoOrThrow(client)
  return crypto.requestVerificationDM(userId, roomId)
}

export function getInProgressVerifications(
  client: MatrixClient,
  userId: string,
): VerificationRequest[] {
  const crypto = getCryptoOrThrow(client)
  return crypto.getVerificationRequestsToDeviceInProgress(userId)
}

// ─── Trust Checks ───────────────────────────────────────────────────

export async function getUserTrust(
  client: MatrixClient,
  userId: string,
): Promise<UserTrustInfo> {
  const crypto = getCryptoOrThrow(client)
  const status: UserVerificationStatus = await crypto.getUserVerificationStatus(userId)

  return {
    verified: status.isVerified(),
    crossSigningVerified: status.isCrossSigningVerified(),
    wasCrossSigningVerified: status.wasCrossSigningVerified(),
    needsUserApproval: status.needsUserApproval,
  }
}

export async function getDeviceTrust(
  client: MatrixClient,
  userId: string,
  deviceId: string,
): Promise<DeviceTrustInfo | null> {
  const crypto = getCryptoOrThrow(client)
  const status: DeviceVerificationStatus | null = await crypto.getDeviceVerificationStatus(userId, deviceId)

  if (!status) {
    return null
  }

  return {
    verified: status.isVerified(),
    signedByOwner: status.signedByOwner,
    crossSigningVerified: status.crossSigningVerified,
    localVerified: status.localVerified,
  }
}

export async function setDeviceVerified(
  client: MatrixClient,
  userId: string,
  deviceId: string,
  verified?: boolean,
): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.setDeviceVerified(userId, deviceId, verified)
}

export async function crossSignDevice(
  client: MatrixClient,
  deviceId: string,
): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.crossSignDevice(deviceId)
}

export async function pinUserIdentity(
  client: MatrixClient,
  userId: string,
): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.pinCurrentUserIdentity(userId)
}

// ─── Encryption Status ──────────────────────────────────────────────

export async function isRoomEncrypted(
  client: MatrixClient,
  roomId: string,
): Promise<boolean> {
  const crypto = getCryptoOrThrow(client)
  return crypto.isEncryptionEnabledInRoom(roomId)
}

// ─── Reset ──────────────────────────────────────────────────────────

export async function resetEncryption(
  client: MatrixClient,
  authUploadDeviceSigningKeys: BootstrapCrossSigningOpts['authUploadDeviceSigningKeys'] & {},
): Promise<void> {
  const crypto = getCryptoOrThrow(client)
  await crypto.resetEncryption(authUploadDeviceSigningKeys)
}
