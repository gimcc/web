import type { MatrixClient, MatrixEvent, User } from 'matrix-js-sdk'
import type { PresenceStatus } from '../stores/presence-store'
import { UserEvent } from 'matrix-js-sdk'
import { usePresenceStore } from '../stores/presence-store'

const VALID_STATUSES = new Set<string>(['online', 'offline', 'unavailable'])

function toPresenceStatus(raw: string): PresenceStatus {
  return VALID_STATUSES.has(raw) ? (raw as PresenceStatus) : 'offline'
}

export function createPresenceBridge(client: MatrixClient): () => void {
  function onPresence(_event: MatrixEvent | undefined, user: User): void {
    usePresenceStore.getState().setPresence(user.userId, {
      status: toPresenceStatus(user.presence),
      lastActiveAgo: user.lastActiveAgo,
      statusMessage: user.presenceStatusMsg,
    })
  }

  client.on(UserEvent.Presence, onPresence)

  return () => {
    client.removeListener(UserEvent.Presence, onPresence)
  }
}
