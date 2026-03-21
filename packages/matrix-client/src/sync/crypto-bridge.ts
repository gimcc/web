import type { MatrixClient } from 'matrix-js-sdk'
import type { VerificationRequest } from 'matrix-js-sdk/lib/crypto-api'
import { ClientEvent } from 'matrix-js-sdk'
import { CryptoEvent } from 'matrix-js-sdk/lib/crypto-api'
import { useCryptoStore } from '../stores/crypto-store'

export function createCryptoBridge(client: MatrixClient): () => void {
  function onVerificationRequest(request: VerificationRequest): void {
    useCryptoStore.getState().setVerificationRequest(request)
  }

  function onKeyBackupStatus(enabled: boolean): void {
    useCryptoStore.getState().setKeyBackupEnabled(enabled)
  }

  function onKeyBackupSessionsRemaining(remaining: number): void {
    const store = useCryptoStore.getState()
    if (remaining > 0) {
      const current = store.keyBackupProgress?.total
        ? store.keyBackupProgress.total - remaining
        : 0
      const total = store.keyBackupProgress?.total ?? remaining
      store.setKeyBackupProgress({ current, total })
    }
    else {
      store.setKeyBackupProgress(null)
    }
  }

  function onKeysChanged(): void {
    checkCrossSigningStatus(client)
    checkSecretStorageStatus(client)
  }

  // After initial sync completes, check all crypto status.
  // Account data (m.cross_signing.master etc.) is only available after sync.
  function onSync(state: string): void {
    if (state === 'PREPARED' || state === 'SYNCING') {
      client.removeListener(ClientEvent.Sync, onSync)
      checkCrossSigningStatus(client)
      checkSecretStorageStatus(client)
    }
  }

  client.on(CryptoEvent.VerificationRequestReceived, onVerificationRequest)
  client.on(CryptoEvent.KeyBackupStatus, onKeyBackupStatus)
  client.on(CryptoEvent.KeyBackupSessionsRemaining, onKeyBackupSessionsRemaining)
  client.on(CryptoEvent.KeysChanged, onKeysChanged)
  client.on(ClientEvent.Sync, onSync)

  return () => {
    client.removeListener(CryptoEvent.VerificationRequestReceived, onVerificationRequest)
    client.removeListener(CryptoEvent.KeyBackupStatus, onKeyBackupStatus)
    client.removeListener(CryptoEvent.KeyBackupSessionsRemaining, onKeyBackupSessionsRemaining)
    client.removeListener(CryptoEvent.KeysChanged, onKeysChanged)
    client.removeListener(ClientEvent.Sync, onSync)
  }
}

/**
 * Refresh all crypto status indicators in the store.
 * Call after bootstrap or any operation that changes crypto state.
 */
export async function refreshCryptoStatus(client: MatrixClient): Promise<void> {
  await Promise.all([
    checkCrossSigningStatus(client),
    checkSecretStorageStatus(client),
  ])
}

async function checkSecretStorageStatus(client: MatrixClient): Promise<void> {
  try {
    const crypto = client.getCrypto()
    if (!crypto)
      return

    const status = await crypto.getSecretStorageStatus()
    useCryptoStore.getState().setSecretStorageReady(status.ready)
  }
  catch {
    // Secret storage status check failed, keep current state
  }
}

async function checkCrossSigningStatus(client: MatrixClient): Promise<void> {
  try {
    const crypto = client.getCrypto()
    if (!crypto)
      return

    // Check if cross-signing keys exist in account data (like Cinny does).
    // getCrossSigningStatus().privateKeysInSecretStorage requires the SSSS
    // cache to be populated, which is not the case after a page reload.
    // Instead, check if the master key exists in account data as a more
    // reliable indicator that cross-signing has been set up.
    const masterEvent = client.getAccountData('m.cross_signing.master')
    const hasKeysInAccountData = !!masterEvent?.getContent()

    const status = await crypto.getCrossSigningStatus()
    useCryptoStore.getState().setCrossSigningReady(
      status.publicKeysOnDevice && (status.privateKeysInSecretStorage || hasKeysInAccountData),
    )
  }
  catch {
    // Cross-signing status check failed, keep current state
  }
}
