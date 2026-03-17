import type { MatrixClient } from 'matrix-js-sdk'

export interface PresenceService {
  setOnline: () => void
  setUnavailable: () => void
  setOffline: () => void
  dispose: () => void
}

export function createPresenceService(client: MatrixClient): PresenceService {
  let disposed = false

  function setPresence(presence: 'online' | 'offline' | 'unavailable'): void {
    if (disposed)
      return
    client.setPresence({ presence }).catch(() => {})
  }

  return {
    setOnline: () => setPresence('online'),
    setUnavailable: () => setPresence('unavailable'),
    setOffline: () => setPresence('offline'),
    dispose: () => { disposed = true },
  }
}
