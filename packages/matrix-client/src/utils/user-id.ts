export interface ParsedUserId {
  localpart: string
  serverName: string
}

export function parseUserId(userId: string): ParsedUserId {
  // Remove leading @ if present
  const normalized = userId.startsWith('@') ? userId.slice(1) : userId
  const colonIndex = normalized.indexOf(':')

  if (colonIndex === -1) {
    return { localpart: normalized, serverName: '' }
  }

  return {
    localpart: normalized.slice(0, colonIndex),
    serverName: normalized.slice(colonIndex + 1),
  }
}

export function formatUserId(
  userId: string,
  connectedServerName: string,
  hideServerName: boolean,
): string {
  if (!hideServerName)
    return userId

  const { localpart, serverName } = parseUserId(userId)

  if (serverName === connectedServerName) {
    return `@${localpart}`
  }

  return userId
}

export function resolveUserId(input: string, connectedServerName: string): string {
  const trimmed = input.trim()

  // Already has a colon — treat as full ID
  if (trimmed.includes(':')) {
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
  }

  // No colon — append server name
  const localpart = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  return `@${localpart}:${connectedServerName}`
}
