// Silent data wipe — erases all local application state.
// Designed for the duress password flow: must leave no recoverable traces.

const STORAGE_PREFIX = 'matrix-web:'

/**
 * Perform a complete, silent wipe of all local data.
 *
 * 1. Remove all `matrix-web:*` keys from localStorage
 * 2. Clear sessionStorage entirely
 * 3. Delete every IndexedDB database
 * 4. Unregister all Service Workers
 * 5. Purge all Cache Storage entries
 *
 * Does **not** navigate or alter the DOM — the caller is responsible for UI.
 */
export async function silentWipe(): Promise<void> {
  // 1. Clear localStorage (matrix-web: prefixed keys)
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX))
      keysToRemove.push(key)
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))

  // 2. Clear sessionStorage
  sessionStorage.clear()

  // 3. Delete all IndexedDB databases
  if (typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
    try {
      const dbs = await indexedDB.databases()
      await Promise.allSettled(
        dbs.map(db => (db.name ? deleteDatabase(db.name) : Promise.resolve())),
      )
    }
    catch {
      // databases() may not be available in all browsers — proceed silently
    }
  }

  // 4. Unregister service workers
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.allSettled(registrations.map(r => r.unregister()))
    }
    catch {
      // Best-effort
    }
  }

  // 5. Purge Cache Storage
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys()
      await Promise.allSettled(cacheNames.map(name => caches.delete(name)))
    }
    catch {
      // Best-effort
    }
  }
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve() // proceed regardless
  })
}
