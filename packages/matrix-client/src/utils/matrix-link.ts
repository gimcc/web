/**
 * Parse and handle matrix.to deep links.
 *
 * Supported formats:
 * - https://matrix.to/#/#room:server.com
 * - https://matrix.to/#/!roomId:server.com
 * - https://matrix.to/#/@user:server.com
 * - https://matrix.to/#/!roomId:server.com/$eventId
 */

export type MatrixLinkType = 'room' | 'user' | 'event'

export interface MatrixLink {
  type: MatrixLinkType
  identifier: string
  eventId?: string
  viaServers?: string[]
}

const MATRIX_TO_REGEX = /^https?:\/\/matrix\.to\/#\/(.+)/
const VIA_REGEX = /via=([^&]+)/g

/**
 * Parse a matrix.to URL into structured data.
 * Returns null if the URL is not a valid matrix.to link.
 */
export function parseMatrixToUrl(url: string): MatrixLink | null {
  const match = url.match(MATRIX_TO_REGEX)
  if (!match)
    return null

  const captured = match[1]
  if (!captured)
    return null

  let fragment: string
  try {
    fragment = decodeURIComponent(captured)
  }
  catch {
    fragment = captured
  }
  const parts = fragment.split('?')
  const path = parts[0] ?? ''
  const query = parts[1] ?? ''

  // Extract via servers from query string
  const viaServers = Array.from(query.matchAll(VIA_REGEX), (m) => {
    try {
      return decodeURIComponent(m[1] ?? '')
    }
    catch {
      return m[1] ?? ''
    }
  })

  // Split path by / to separate room from event ID
  const segments = path.split('/')

  const identifier = segments[0]
  if (!identifier)
    return null

  // User link: @user:server
  if (identifier.startsWith('@')) {
    return { type: 'user', identifier, viaServers: viaServers.length > 0 ? viaServers : undefined }
  }

  // Room link: #room:server or !roomId:server
  if (identifier.startsWith('#') || identifier.startsWith('!')) {
    const eventId = segments[1]?.startsWith('$') ? segments[1] : undefined
    return {
      type: eventId ? 'event' : 'room',
      identifier,
      eventId,
      viaServers: viaServers.length > 0 ? viaServers : undefined,
    }
  }

  return null
}

/**
 * Check if a string is a matrix.to URL.
 */
export function isMatrixToUrl(url: string): boolean {
  return MATRIX_TO_REGEX.test(url)
}

/**
 * Check if a string is a Matrix room identifier (room ID or alias).
 */
export function isRoomIdentifier(value: string): boolean {
  return value.startsWith('#') || value.startsWith('!')
}

/**
 * Check if a string is a Matrix user identifier.
 */
export function isUserIdentifier(value: string): boolean {
  return value.startsWith('@') && value.includes(':')
}

/**
 * Build a matrix.to URL from a Matrix identifier.
 */
export function buildMatrixToUrl(identifier: string, eventId?: string): string {
  let url = `https://matrix.to/#/${encodeURIComponent(identifier)}`
  if (eventId) {
    url += `/${encodeURIComponent(eventId)}`
  }
  return url
}
