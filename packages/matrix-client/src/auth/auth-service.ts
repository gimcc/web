import type { UiaAuth, UiaChallenge } from './uia-service'
import { createClient } from 'matrix-js-sdk'
import { z } from 'zod'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decrypt,
  encrypt,
  hasPasswordSet,
} from '../crypto/dek-manager'
import { extractUiaChallenge, getRemainingStages, selectBestFlow, UIA_STAGE } from './uia-service'

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

/** Registration completed successfully */
export interface RegistrationComplete {
  status: 'completed'
  session: AuthSession
}

/** Server requires additional UIA stages before registration completes */
export interface RegistrationNeedsAuth {
  status: 'needsAuth'
  uiaSession: string
  flows: Array<{ stages: string[] }>
  completed: string[]
  remaining: string[]
  params: Record<string, Record<string, unknown>>
  selectedFlow: { stages: string[] } | null
}

export type RegistrationResult = RegistrationComplete | RegistrationNeedsAuth

const SESSION_KEY = 'matrix-web:session'
const ENCRYPTED_PREFIX = 'enc:'

const authSessionSchema = z.object({
  userId: z.string().min(1),
  accessToken: z.string().min(1),
  deviceId: z.string().min(1),
  homeserverUrl: z.string().min(1),
})

export async function persistSession(session: AuthSession, dek: CryptoKey | null): Promise<void> {
  const json = JSON.stringify(session)
  if (dek && hasPasswordSet()) {
    const encoder = new TextEncoder()
    const encrypted = await encrypt(dek, encoder.encode(json).buffer as ArrayBuffer)
    localStorage.setItem(SESSION_KEY, ENCRYPTED_PREFIX + arrayBufferToBase64(encrypted))
  }
  else {
    localStorage.setItem(SESSION_KEY, json)
  }
}

export async function loadPersistedSession(dek: CryptoKey | null): Promise<AuthSession | null> {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw)
    return null

  try {
    if (raw.startsWith(ENCRYPTED_PREFIX)) {
      if (!dek)
        return null // can't decrypt without DEK — retry after unlock
      const encrypted = base64ToArrayBuffer(raw.slice(ENCRYPTED_PREFIX.length))
      const decrypted = await decrypt(dek, encrypted)
      const json = new TextDecoder().decode(decrypted)
      return authSessionSchema.parse(JSON.parse(json))
    }
    return authSessionSchema.parse(JSON.parse(raw))
  }
  catch {
    // Only clear if data is plaintext-corrupt or decryption with valid DEK failed
    if (!raw.startsWith(ENCRYPTED_PREFIX) || dek) {
      clearPersistedSession()
    }
    return null
  }
}

export function isSessionEncrypted(): boolean {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw !== null && raw.startsWith(ENCRYPTED_PREFIX)
}

export async function reEncryptSession(dek: CryptoKey): Promise<void> {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw)
    return

  if (hasPasswordSet() && !raw.startsWith(ENCRYPTED_PREFIX)) {
    // Plaintext session needs encryption now that password is set
    try {
      const session = authSessionSchema.parse(JSON.parse(raw))
      await persistSession(session, dek)
    }
    catch {
      // corrupt plaintext data, leave as-is
    }
  }
  else if (!hasPasswordSet() && raw.startsWith(ENCRYPTED_PREFIX)) {
    // Password removed — decrypt session back to plaintext
    try {
      const encrypted = base64ToArrayBuffer(raw.slice(ENCRYPTED_PREFIX.length))
      const decrypted = await decrypt(dek, encrypted)
      const json = new TextDecoder().decode(decrypted)
      const session = authSessionSchema.parse(JSON.parse(json))
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
    catch {
      // can't decrypt, leave as-is
    }
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

export async function loginWithToken(homeserverUrl: string, token: string): Promise<AuthSession> {
  const client = createClient({ baseUrl: homeserverUrl })

  const response = await client.login('m.login.token', { token })

  if (!response.user_id || !response.access_token || !response.device_id) {
    throw new Error('Unexpected login response: missing required fields')
  }

  return {
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
    homeserverUrl,
  }
}

/**
 * Parse a successful registration response into an AuthSession.
 */
function parseRegistrationResponse(
  response: { user_id: string, access_token?: string, device_id?: string },
  homeserverUrl: string,
): AuthSession | null {
  if (!response.access_token || !response.device_id)
    return null
  return {
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
    homeserverUrl,
  }
}

/**
 * Build a RegistrationNeedsAuth result from a UIA challenge.
 */
function buildNeedsAuthResult(challenge: UiaChallenge): RegistrationNeedsAuth {
  const remaining = getRemainingStages(challenge)
  const selectedFlow = selectBestFlow(challenge)
  return {
    status: 'needsAuth',
    uiaSession: challenge.session,
    flows: challenge.flows,
    completed: challenge.completed ?? [],
    remaining,
    params: challenge.params ?? {},
    selectedFlow,
  }
}

/**
 * Start a new registration. Returns either a completed session (if server
 * accepts m.login.dummy without further stages) or a UIA challenge describing
 * the stages the caller must complete.
 */
export async function register(credentials: AuthCredentials): Promise<RegistrationResult> {
  const client = createClient({ baseUrl: credentials.homeserverUrl })

  try {
    // Attempt registration with m.login.dummy — works on permissive servers
    const response = await client.registerRequest({
      username: credentials.username,
      password: credentials.password,
      auth: { type: UIA_STAGE.DUMMY },
    })

    const session = parseRegistrationResponse(response, credentials.homeserverUrl)
    if (session) {
      return { status: 'completed', session }
    }

    // 200 but no access_token means something unexpected happened
    throw new Error('Server returned success but did not provide access credentials')
  }
  catch (error: unknown) {
    // Check if this is a UIA challenge (401 with flows)
    const challenge = extractUiaChallenge(error)
    if (challenge) {
      return buildNeedsAuthResult(challenge)
    }

    // Re-throw non-UIA errors
    if (error instanceof Error)
      throw error
    throw new Error('Registration failed with an unexpected error')
  }
}

/**
 * Continue a registration by submitting a completed UIA stage.
 *
 * Call this after the UI has gathered the required information for a stage
 * (e.g., user accepted terms, completed recaptcha, verified email).
 */
export async function registerContinue(
  credentials: AuthCredentials,
  auth: UiaAuth,
): Promise<RegistrationResult> {
  const client = createClient({ baseUrl: credentials.homeserverUrl })

  try {
    const response = await client.registerRequest({
      username: credentials.username,
      password: credentials.password,
      auth,
    })

    const session = parseRegistrationResponse(response, credentials.homeserverUrl)
    if (session) {
      return { status: 'completed', session }
    }

    throw new Error('Server returned success but did not provide access credentials')
  }
  catch (error: unknown) {
    const challenge = extractUiaChallenge(error)
    if (challenge) {
      return buildNeedsAuthResult(challenge)
    }

    if (error instanceof Error)
      throw error
    throw new Error('Registration stage failed with an unexpected error')
  }
}
