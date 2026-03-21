/**
 * Secret storage key cache (following Cinny's pattern).
 *
 * Keys are stored in a global Map so the SDK's `cryptoCallbacks` can find
 * them when `bootstrapSecretStorage` or `bootstrapCrossSigning` needs access
 * to secret storage.
 */

const secretStorageKeys = new Map<string, Uint8Array>()

/** Cache a decoded private key for use by SDK crypto callbacks. */
export function storePrivateKey(keyId: string, privateKey: Uint8Array): void {
  if (!(privateKey instanceof Uint8Array)) {
    throw new Error('Unable to store, privateKey is invalid.')
  }
  secretStorageKeys.set(keyId, privateKey)
}

export function hasPrivateKey(keyId: string): boolean {
  return secretStorageKeys.get(keyId) instanceof Uint8Array
}

function getPrivateKey(keyId: string): Uint8Array | undefined {
  return secretStorageKeys.get(keyId)
}

/** Clear all cached secret storage keys. Call before bootstrap to avoid stale keys. */
export function clearSecretStorageKeys(): void {
  secretStorageKeys.clear()
}

// ─── CryptoCallbacks ─────────────────────────────────────────────

/**
 * SDK callback: returns a cached secret storage key if one is available.
 * If no key is cached, returns undefined so the SDK can prompt via other means.
 */
async function getSecretStorageKey(
  opts: { keys: Record<string, unknown> },
): Promise<[string, Uint8Array] | undefined> {
  const keyIds = Object.keys(opts.keys)
  const keyId = keyIds.find(hasPrivateKey)
  if (!keyId) return undefined
  const privateKey = getPrivateKey(keyId)
  if (!privateKey) return undefined
  return [keyId, privateKey]
}

/**
 * SDK callback: called when the SDK generates or discovers a secret storage key.
 */
function cacheSecretStorageKey(
  keyId: string,
  _keyInfo: unknown,
  privateKey: Uint8Array,
): void {
  secretStorageKeys.set(keyId, privateKey)
}

export const cryptoCallbacks = {
  getSecretStorageKey,
  cacheSecretStorageKey,
}
