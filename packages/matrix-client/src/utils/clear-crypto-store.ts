const CRYPTO_RE = /crypto/i

/**
 * Delete all IndexedDB databases related to the Rust crypto store.
 * Used during logout and as a recovery mechanism when the stored
 * device ID no longer matches the current session.
 */
export function clearCryptoStore(): void {
  clearCryptoStoreAsync().catch(() => {
    // Best-effort — fire and forget
  })
}

export async function clearCryptoStoreAsync(): Promise<void> {
  if (typeof indexedDB === 'undefined' || !('databases' in indexedDB))
    return

  const dbs = await indexedDB.databases()
  await Promise.allSettled(
    dbs
      .filter(db => db.name && CRYPTO_RE.test(db.name))
      .map(db => new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(db.name!)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
        req.onblocked = () => resolve()
      })),
  )
}
