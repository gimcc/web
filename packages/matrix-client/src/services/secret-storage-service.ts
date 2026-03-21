import type { SecretStorageKeyDescription } from 'matrix-js-sdk/lib/secret-storage'
import { getMatrixClient } from '../client/client-manager'
import { useCryptoStore } from '../stores/crypto-store'

// ─── Cached Key ────────────────────────────────────────────────────

let cachedKey: { keyId: string, key: Uint8Array<ArrayBuffer> } | null = null

// ─── CryptoCallbacks ───────────────────────────────────────────────

/**
 * SDK callback: called when a new default secret storage key is created
 * during bootstrapSecretStorage(). Caches the key for later retrieval.
 */
export function cacheSecretStorageKey(
  keyId: string,
  _keyInfo: SecretStorageKeyDescription,
  key: Uint8Array<ArrayBuffer>,
): void {
  cachedKey = { keyId, key }
}

/**
 * SDK callback: called when the crypto stack needs to access secret storage.
 * Returns the cached key if available, otherwise bridges to the UI via the
 * crypto store so the user can provide the recovery key / passphrase.
 */
export async function getSecretStorageKey(
  opts: { keys: Record<string, SecretStorageKeyDescription> },
  _name: string,
): Promise<[string, Uint8Array<ArrayBuffer>] | null> {
  // 1. Try cached key first
  if (cachedKey && opts.keys[cachedKey.keyId]) {
    return [cachedKey.keyId, cachedKey.key]
  }

  // 2. Bridge to UI — store a promise resolver so the dialog can fulfill it
  return new Promise<[string, Uint8Array<ArrayBuffer>] | null>((resolve) => {
    useCryptoStore.getState().requestSecretStorageKey(opts.keys, resolve)
  })
}

/**
 * Clear the in-memory cached secret storage key.
 */
export function clearCachedSecretStorageKey(): void {
  cachedKey = null
}

// ─── Secret Storage Operations ─────────────────────────────────────

/**
 * Set up SSSS with a random recovery key.
 * Returns the encoded recovery key string for display to the user.
 */
export async function setupSecretStorage(opts?: {
  setupNewKeyBackup?: boolean
}): Promise<string> {
  const client = getMatrixClient()
  if (!client) throw new Error('Matrix client not available')

  const crypto = client.getCrypto()
  if (!crypto) throw new Error('Crypto not initialized')

  const recoveryKey = await crypto.createRecoveryKeyFromPassphrase()

  // Cache the key so the SDK callback can find it during bootstrap
  cachedKey = { keyId: '', key: recoveryKey.privateKey }

  await crypto.bootstrapSecretStorage({
    createSecretStorageKey: async () => recoveryKey,
    setupNewKeyBackup: opts?.setupNewKeyBackup ?? true,
  })

  await refreshSecretStorageStatus()

  return recoveryKey.encodedPrivateKey!
}

/**
 * Set up SSSS derived from a user-chosen passphrase.
 * Returns the encoded recovery key string as backup.
 */
export async function setupSecretStorageWithPassphrase(
  passphrase: string,
  opts?: { setupNewKeyBackup?: boolean },
): Promise<string> {
  const client = getMatrixClient()
  if (!client) throw new Error('Matrix client not available')

  const crypto = client.getCrypto()
  if (!crypto) throw new Error('Crypto not initialized')

  const recoveryKey = await crypto.createRecoveryKeyFromPassphrase(passphrase)

  cachedKey = { keyId: '', key: recoveryKey.privateKey }

  await crypto.bootstrapSecretStorage({
    createSecretStorageKey: async () => recoveryKey,
    setupNewKeyBackup: opts?.setupNewKeyBackup ?? true,
  })

  await refreshSecretStorageStatus()

  return recoveryKey.encodedPrivateKey!
}

/**
 * Reset secret storage — creates new key, new key backup.
 * Returns the new encoded recovery key.
 */
export async function resetSecretStorage(): Promise<string> {
  const client = getMatrixClient()
  if (!client) throw new Error('Matrix client not available')

  const crypto = client.getCrypto()
  if (!crypto) throw new Error('Crypto not initialized')

  const recoveryKey = await crypto.createRecoveryKeyFromPassphrase()

  cachedKey = { keyId: '', key: recoveryKey.privateKey }

  await crypto.bootstrapSecretStorage({
    createSecretStorageKey: async () => recoveryKey,
    setupNewSecretStorage: true,
    setupNewKeyBackup: true,
  })

  await refreshSecretStorageStatus()

  return recoveryKey.encodedPrivateKey!
}

// ─── Status ────────────────────────────────────────────────────────

/**
 * Check and update the secret storage ready state in the store.
 */
export async function refreshSecretStorageStatus(): Promise<boolean> {
  const client = getMatrixClient()
  if (!client) return false

  const crypto = client.getCrypto()
  if (!crypto) return false

  try {
    const ready = await crypto.isSecretStorageReady()
    useCryptoStore.getState().setSecretStorageReady(ready)
    return ready
  }
  catch {
    useCryptoStore.getState().setSecretStorageReady(false)
    return false
  }
}
