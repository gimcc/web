// Duress password management
// Stores only a PBKDF2-derived verification hash — never the plaintext password.

import { verifyPassword } from './dek-manager'

const DURESS_HASH_KEY = 'matrix-web:duress-hash'
const DURESS_SALT_KEY = 'matrix-web:duress-salt'

const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 16
const HASH_BITS = 256

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES))
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  for (const byte of buffer)
    binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveHash(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS,
  )
  return bufferToBase64(new Uint8Array(bits))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Check whether a duress password has been configured. */
export function hasDuressPassword(): boolean {
  return localStorage.getItem(DURESS_HASH_KEY) !== null
    && localStorage.getItem(DURESS_SALT_KEY) !== null
}

/**
 * Set a new duress password.
 * Verifies that the duress password differs from the normal password
 * by checking if it matches the stored normal password hash (no plaintext needed).
 *
 * @throws {Error} if duress password matches the normal password.
 */
export async function setDuressPassword(duressPassword: string): Promise<void> {
  const matchesNormal = await verifyPassword(duressPassword)
  if (matchesNormal)
    throw new Error('Duress password must differ from the normal password')

  const salt = generateSalt()
  const hash = await deriveHash(duressPassword, salt)

  localStorage.setItem(DURESS_SALT_KEY, bufferToBase64(salt))
  localStorage.setItem(DURESS_HASH_KEY, hash)
}

/** Verify whether the given password matches the stored duress hash. */
export async function verifyDuressPassword(password: string): Promise<boolean> {
  const storedHash = localStorage.getItem(DURESS_HASH_KEY)
  const storedSalt = localStorage.getItem(DURESS_SALT_KEY)
  if (!storedHash || !storedSalt)
    return false

  const salt = base64ToBuffer(storedSalt)
  const hash = await deriveHash(password, salt)

  // Constant-length comparison (both strings are fixed-length base64)
  if (hash.length !== storedHash.length)
    return false

  let mismatch = 0
  for (let i = 0; i < hash.length; i++)
    mismatch |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  return mismatch === 0
}

/**
 * Change the duress password.
 * Verifies that the new duress password differs from the normal password.
 *
 * @throws {Error} if new duress password matches the normal password.
 */
export async function changeDuressPassword(newDuressPassword: string): Promise<void> {
  const matchesNormal = await verifyPassword(newDuressPassword)
  if (matchesNormal)
    throw new Error('Duress password must differ from the normal password')

  const salt = generateSalt()
  const hash = await deriveHash(newDuressPassword, salt)

  localStorage.setItem(DURESS_SALT_KEY, bufferToBase64(salt))
  localStorage.setItem(DURESS_HASH_KEY, hash)
}

/** Remove the stored duress password entirely. */
export function removeDuressPassword(): void {
  localStorage.removeItem(DURESS_HASH_KEY)
  localStorage.removeItem(DURESS_SALT_KEY)
}

/** Alias — clear duress-related data only. */
export function clearDuressData(): void {
  removeDuressPassword()
}
