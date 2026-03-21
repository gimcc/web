import type { MatrixClient } from 'matrix-js-sdk'
import type { VerificationRequest } from 'matrix-js-sdk/lib/crypto-api'
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
  }

  client.on(CryptoEvent.VerificationRequestReceived, onVerificationRequest)
  client.on(CryptoEvent.KeyBackupStatus, onKeyBackupStatus)
  client.on(CryptoEvent.KeyBackupSessionsRemaining, onKeyBackupSessionsRemaining)
  client.on(CryptoEvent.KeysChanged, onKeysChanged)

  return () => {
    client.removeListener(CryptoEvent.VerificationRequestReceived, onVerificationRequest)
    client.removeListener(CryptoEvent.KeyBackupStatus, onKeyBackupStatus)
    client.removeListener(CryptoEvent.KeyBackupSessionsRemaining, onKeyBackupSessionsRemaining)
    client.removeListener(CryptoEvent.KeysChanged, onKeysChanged)
  }
}

async function checkCrossSigningStatus(client: MatrixClient): Promise<void> {
  try {
    const crypto = client.getCrypto()
    if (!crypto)
      return

    const status = await crypto.getCrossSigningStatus()
    useCryptoStore.getState().setCrossSigningReady(
      status.publicKeysOnDevice && status.privateKeysInSecretStorage,
    )
  }
  catch {
    // Cross-signing status check failed, keep current state
  }
}
