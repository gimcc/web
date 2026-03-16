import { createClient } from 'matrix-js-sdk'
import { z } from 'zod/v4'

export interface AuthCredentials {
  homeserverUrl: string
  username: string
  password: string
}

export interface AuthSession {
  userId: string
  accessToken: string
  deviceId: string
  homeserverUrl: string
}

// SECURITY: accessToken in localStorage is vulnerable to XSS.
// Phase 4.5 (local security) will encrypt stored data with DEK/KEK.
// See PLAN-001 section 7 for the full encryption architecture.
const SESSION_KEY = 'matrix-web:session'

const authSessionSchema = z.object({
  userId: z.string().min(1),
  accessToken: z.string().min(1),
  deviceId: z.string().min(1),
  homeserverUrl: z.string().min(1),
})

export function persistSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadPersistedSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw)
    return null
  try {
    return authSessionSchema.parse(JSON.parse(raw))
  }
  catch {
    clearPersistedSession()
    return null
  }
}

export function clearPersistedSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function login(credentials: AuthCredentials): Promise<AuthSession> {
  const client = createClient({ baseUrl: credentials.homeserverUrl })

  const response = await client.loginWithPassword(
    credentials.username,
    credentials.password,
  )

  if (!response.user_id || !response.access_token || !response.device_id) {
    throw new Error('Unexpected login response: missing required fields')
  }

  const session: AuthSession = {
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
    homeserverUrl: credentials.homeserverUrl,
  }

  return session
}

export async function register(credentials: AuthCredentials): Promise<AuthSession> {
  const client = createClient({ baseUrl: credentials.homeserverUrl })

  const response = await client.registerRequest({
    username: credentials.username,
    password: credentials.password,
    auth: { type: 'm.login.dummy' },
  })

  if (!response.access_token || !response.device_id) {
    throw new Error('Registration requires additional verification steps not yet supported')
  }

  const session: AuthSession = {
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
    homeserverUrl: credentials.homeserverUrl,
  }

  return session
}
