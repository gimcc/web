// Unified password verification for the lock screen.
//
// Verification order is security-critical:
//   1. Try the normal (lock-screen) password first.
//   2. Only if it fails, try the duress password.
//   3. If both fail, report invalid.
//
// This ordering prevents accidental duress triggers when a user simply
// mistypes their normal password.

import { hasPasswordSet, verifyPassword } from './dek-manager'
import { verifyDuressPassword } from './duress-manager'

export type VerificationResult
  = | { type: 'normal' }
    | { type: 'duress' }
    | { type: 'invalid' }

/** Check whether a normal lock-screen password has been configured. */
export function hasNormalPassword(): boolean {
  return hasPasswordSet()
}

/**
 * Verify a password input against stored credentials.
 *
 * Returns `{ type: 'normal' }` if the normal password matches,
 * `{ type: 'duress' }` if the duress password matches, or
 * `{ type: 'invalid' }` if neither matches.
 */
export async function verifyPasswordInput(password: string): Promise<VerificationResult> {
  // 1. Try normal password first
  if (hasPasswordSet()) {
    const isNormal = await verifyPassword(password)
    if (isNormal) {
      return { type: 'normal' }
    }
  }

  // 2. Try duress password (only if normal failed)
  const isDuress = await verifyDuressPassword(password)
  if (isDuress) {
    return { type: 'duress' }
  }

  // 3. No match
  return { type: 'invalid' }
}
