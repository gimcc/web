// DEK (Data Encryption Key) manager — two-layer encryption: DEK + KEK
// Uses Web Crypto API exclusively. No external crypto libraries.

const STORAGE_PREFIX = 'matrix-web:'
const DEK_KEY = `${STORAGE_PREFIX}dek`
const SALT_KEY = `${STORAGE_PREFIX}salt`
const PASSWORD_HASH_KEY = `${STORAGE_PREFIX}password-hash`
const HAS_PASSWORD_KEY = `${STORAGE_PREFIX}has-password`

const PBKDF2_ITERATIONS = 600_000
const IV_LENGTH = 12
const SALT_LENGTH = 16

// --- ArrayBuffer <-> Base64 utilities ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

// --- DEK generation and import/export ---

export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function exportDek(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key)
}

export async function importDek(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

// --- AES-256-GCM encrypt/decrypt ---

export async function encrypt(dek: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    data,
  )
  // Prepend IV to ciphertext
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(ciphertext), IV_LENGTH)
  return result.buffer as ArrayBuffer
}

export async function decrypt(dek: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  if (data.byteLength <= IV_LENGTH) {
    throw new Error('Encrypted data is too short')
  }
  const dataBytes = new Uint8Array(data)
  const iv = dataBytes.slice(0, IV_LENGTH)
  const ciphertext = dataBytes.slice(IV_LENGTH)
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    dek,
    ciphertext,
  )
}

// --- KEK derivation from password ---

export async function deriveKek(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// --- Password hash for verification (separate derivation from KEK) ---

export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  // Use a different salt derivation to produce a verification hash
  // distinct from the KEK. Append a fixed suffix to the salt.
  const hashSalt = new Uint8Array(salt.length + 4)
  hashSalt.set(salt, 0)
  hashSalt.set(new TextEncoder().encode('hash'), salt.length)

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hashSalt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return arrayBufferToBase64(bits)
}

// --- Salt generation ---

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

// --- Persist DEK plaintext (no password) ---

export function persistDekPlaintext(dekRaw: ArrayBuffer): void {
  localStorage.setItem(DEK_KEY, arrayBufferToBase64(dekRaw))
  localStorage.removeItem(SALT_KEY)
  localStorage.removeItem(PASSWORD_HASH_KEY)
  localStorage.setItem(HAS_PASSWORD_KEY, 'false')
}

// --- Persist DEK encrypted (with password) ---

export async function persistDekEncrypted(dekRaw: ArrayBuffer, password: string): Promise<void> {
  const salt = generateSalt()
  const kek = await deriveKek(password, salt)
  const encryptedDek = await encrypt(kek, dekRaw)
  const passwordHash = await hashPassword(password, salt)

  localStorage.setItem(DEK_KEY, arrayBufferToBase64(encryptedDek))
  localStorage.setItem(SALT_KEY, arrayBufferToBase64(salt.buffer as ArrayBuffer))
  localStorage.setItem(PASSWORD_HASH_KEY, passwordHash)
  localStorage.setItem(HAS_PASSWORD_KEY, 'true')
}

// --- Load DEK ---

export function hasDekStored(): boolean {
  return localStorage.getItem(DEK_KEY) !== null
}

export function hasPasswordSet(): boolean {
  return localStorage.getItem(HAS_PASSWORD_KEY) === 'true'
}

export async function loadDekWithPassword(password: string): Promise<CryptoKey> {
  const saltB64 = localStorage.getItem(SALT_KEY)
  const dekB64 = localStorage.getItem(DEK_KEY)

  if (!saltB64 || !dekB64) {
    throw new Error('No encrypted DEK or salt found in storage')
  }

  const salt = new Uint8Array(base64ToArrayBuffer(saltB64))
  const kek = await deriveKek(password, salt)
  const encryptedDek = base64ToArrayBuffer(dekB64)
  const dekRaw = await decrypt(kek, encryptedDek)
  return importDek(dekRaw)
}

export async function loadDekPlaintext(): Promise<CryptoKey> {
  const dekB64 = localStorage.getItem(DEK_KEY)
  if (!dekB64) {
    throw new Error('No DEK found in storage')
  }
  const dekRaw = base64ToArrayBuffer(dekB64)
  return importDek(dekRaw)
}

// --- Password management ---

export async function setPassword(currentDek: CryptoKey, password: string): Promise<void> {
  const dekRaw = await exportDek(currentDek)
  await persistDekEncrypted(dekRaw, password)
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const isValid = await verifyPassword(oldPassword)
  if (!isValid) {
    throw new Error('Current password is incorrect')
  }
  const dek = await loadDekWithPassword(oldPassword)
  const dekRaw = await exportDek(dek)
  await persistDekEncrypted(dekRaw, newPassword)
}

export async function removePassword(password: string): Promise<void> {
  const isValid = await verifyPassword(password)
  if (!isValid) {
    throw new Error('Password is incorrect')
  }
  const dek = await loadDekWithPassword(password)
  const dekRaw = await exportDek(dek)
  persistDekPlaintext(dekRaw)
}

export async function verifyPassword(password: string): Promise<boolean> {
  const saltB64 = localStorage.getItem(SALT_KEY)
  const storedHash = localStorage.getItem(PASSWORD_HASH_KEY)

  if (!saltB64 || !storedHash) {
    return false
  }

  const salt = new Uint8Array(base64ToArrayBuffer(saltB64))
  const computedHash = await hashPassword(password, salt)
  // Constant-time comparison via string equality on fixed-length base64
  if (computedHash.length !== storedHash.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i)
  }
  return result === 0
}

// --- Clear all local data ---

export async function clearAllLocalData(): Promise<void> {
  // Remove all matrix-web:* keys from localStorage
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }

  // Also clear the auth session key used by auth-service
  localStorage.removeItem('matrix-web:session')

  // Clear sessionStorage
  sessionStorage.clear()

  // Clear all IndexedDB databases
  if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
    const dbs = await indexedDB.databases()
    await Promise.all(
      dbs
        .filter(db => db.name)
        .map(db => new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(db.name!)
          req.onsuccess = () => resolve()
          req.onerror = () => resolve()
          req.onblocked = () => resolve()
        })),
    )
  }
}
