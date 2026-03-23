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

export interface UiaTermsAuth {
  type: 'm.login.terms'
  session: string
}

export interface UiaRecaptchaAuth {
  type: 'm.login.recaptcha'
  session: string
  response: string
}

export interface UiaEmailIdentityAuth {
  type: 'm.login.email.identity'
  session: string
  threepid_creds: {
    sid: string
    client_secret: string
  }
}

export type UiaAuth
  = | UiaPasswordAuth
    | UiaDummyAuth
    | UiaTermsAuth
    | UiaRecaptchaAuth
    | UiaEmailIdentityAuth

/** Known UIA stage types */
export const UIA_STAGE = {
  DUMMY: 'm.login.dummy',
  PASSWORD: 'm.login.password',
  TERMS: 'm.login.terms',
  RECAPTCHA: 'm.login.recaptcha',
  EMAIL_IDENTITY: 'm.login.email.identity',
} as const

/**
 * Check if an error response is a UIA challenge (HTTP 401 with flows).
 */
export function isUiaChallenge(error: unknown): error is { data: UiaChallenge, httpStatus: number } {
  if (typeof error !== 'object' || error === null)
    return false
  if (!('httpStatus' in error) || error.httpStatus !== 401)
    return false
  if (!('data' in error) || typeof error.data !== 'object' || error.data === null)
    return false
  const data = error.data as Record<string, unknown>
  return Array.isArray(data.flows) && typeof data.session === 'string'
}

/**
 * Extract the UIA challenge from an error response.
 */
export function extractUiaChallenge(error: unknown): UiaChallenge | null {
  if (!isUiaChallenge(error))
    return null
  return error.data
}

/**
 * Get the remaining stages needed to complete a UIA flow.
 */
export function getRemainingStages(challenge: UiaChallenge): string[] {
  const completed = new Set(challenge.completed ?? [])

  // Check the first flow for remaining stages
  const flow = challenge.flows[0]
  if (!flow)
    return []
  const remaining = flow.stages.filter(s => !completed.has(s))
  return remaining
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

/**
 * Build a terms auth object for UIA (user accepted terms of service).
 */
export function buildTermsAuth(session: string): UiaTermsAuth {
  return {
    type: 'm.login.terms',
    session,
  }
}

/**
 * Build a recaptcha auth object for UIA.
 */
export function buildRecaptchaAuth(session: string, response: string): UiaRecaptchaAuth {
  return {
    type: 'm.login.recaptcha',
    session,
    response,
  }
}

/**
 * Build an email identity auth object for UIA.
 */
export function buildEmailIdentityAuth(
  session: string,
  sid: string,
  clientSecret: string,
): UiaEmailIdentityAuth {
  return {
    type: 'm.login.email.identity',
    session,
    threepid_creds: {
      sid,
      client_secret: clientSecret,
    },
  }
}

/**
 * Find the best flow from available flows that the client can complete.
 * Prefers flows with fewer stages and flows containing only known stage types.
 */
export function selectBestFlow(
  challenge: UiaChallenge,
): { stages: string[] } | null {
  const knownStages = new Set<string>(Object.values(UIA_STAGE))
  const completable = challenge.flows
    .filter(flow => flow.stages.every(s => knownStages.has(s)))
    .sort((a, b) => a.stages.length - b.stages.length)
  return completable[0] ?? challenge.flows[0] ?? null
}
