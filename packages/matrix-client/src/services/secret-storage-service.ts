import { getMatrixClient } from '../client/client-manager'
import { useCryptoStore } from '../stores/crypto-store'

// ─── Status ────────────────────────────────────────────────────────

/**
 * Check and update the secret storage ready state in the store.
 */
export async function refreshSecretStorageStatus(): Promise<boolean> {
  const client = getMatrixClient()
  if (!client)
    return false

  const crypto = client.getCrypto()
  if (!crypto)
    return false

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
