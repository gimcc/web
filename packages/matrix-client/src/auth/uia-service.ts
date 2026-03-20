/**
 * User-Interactive Authentication (UIA) service.
 *
 * When a Matrix API returns 401 with a UIA challenge, the client must
 * complete one or more authentication stages before the operation proceeds.
 */

export interface UiaStage {
  type: string
  params?: Record<string, unknown>
}

export interface UiaChallenge {
  session: string
  flows: Array<{ stages: string[] }>
  params?: Record<string, Record<string, unknown>>
  completed?: string[]
  error?: string
  errcode?: string
}

export interface UiaPasswordAuth {
  type: 'm.login.password'
  session: string
  identifier: {
    type: 'm.id.user'
    user: string
  }
  password: string
}

export interface UiaDummyAuth {
  type: 'm.login.dummy'
  session: string
}

export type UiaAuth = UiaPasswordAuth | UiaDummyAuth

/**
 * Check if an error response is a UIA challenge (HTTP 401 with flows).
 */
export function isUiaChallenge(error: unknown): error is { data: UiaChallenge; httpStatus: number } {
  if (typeof error !== 'object' || error === null) return false
  if (!('httpStatus' in error) || error.httpStatus !== 401) return false
  if (!('data' in error) || typeof error.data !== 'object' || error.data === null) return false
  const data = error.data as Record<string, unknown>
  return Array.isArray(data.flows) && typeof data.session === 'string'
}

/**
 * Extract the UIA challenge from an error response.
 */
export function extractUiaChallenge(error: unknown): UiaChallenge | null {
  if (!isUiaChallenge(error)) return null
  return error.data
}

/**
 * Get the remaining stages needed to complete a UIA flow.
 */
export function getRemainingStages(challenge: UiaChallenge): string[] {
  const completed = new Set(challenge.completed ?? [])

  // Find the first flow where all stages can be completed
  for (const flow of challenge.flows) {
    const remaining = flow.stages.filter(s => !completed.has(s))
    if (remaining.length === 0) return []
    return remaining
  }

  return challenge.flows[0]?.stages.filter(s => !completed.has(s)) ?? []
}

/**
 * Build a password auth object for UIA.
 */
export function buildPasswordAuth(session: string, userId: string, password: string): UiaPasswordAuth {
  return {
    type: 'm.login.password',
    session,
    identifier: {
      type: 'm.id.user',
      user: userId,
    },
    password,
  }
}

/**
 * Build a dummy auth object for UIA (used when no real auth is needed).
 */
export function buildDummyAuth(session: string): UiaDummyAuth {
  return {
    type: 'm.login.dummy',
    session,
  }
}
