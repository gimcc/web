import { createClient } from 'matrix-js-sdk'
import { AuthType } from 'matrix-js-sdk/lib/interactive-auth'

export interface RequestPasswordResetResult {
  sid: string
}

/**
 * Request a password reset email token.
 * The homeserver sends an email with a validation link.
 */
export async function requestPasswordResetEmail(
  homeserverUrl: string,
  email: string,
  clientSecret: string,
  sendAttempt: number,
): Promise<RequestPasswordResetResult> {
  const client = createClient({ baseUrl: homeserverUrl })

  const response = await client.requestPasswordEmailToken(
    email,
    clientSecret,
    sendAttempt,
  )

  return { sid: response.sid }
}

/**
 * Check if the email token has been validated by the user.
 * Calls the homeserver's 3PID check endpoint.
 */
export async function checkEmailValidation(
  homeserverUrl: string,
  sid: string,
  clientSecret: string,
): Promise<boolean> {
  const url = `${homeserverUrl}/_matrix/client/v3/account/password`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth: {
        type: AuthType.Email,
        threepid_creds: { sid, client_secret: clientSecret },
      },
    }),
  })

  if (response.ok)
    return true
  const data = await response.json()
  // If we get a UIA 401 with completed stages including email, it's validated
  if (response.status === 401 && data.completed?.includes(AuthType.Email)) {
    return true
  }
  // If 401 without email completed, not yet validated
  if (response.status === 401)
    return false
  // M_UNAUTHORIZED means token not yet validated
  if (data.errcode === 'M_UNAUTHORIZED')
    return false
  return false
}

/**
 * Submit the new password after email verification.
 * Requires the sid from the email token request and the client secret.
 */
export async function submitNewPassword(
  homeserverUrl: string,
  newPassword: string,
  sid: string,
  clientSecret: string,
  logoutDevices: boolean = true,
): Promise<void> {
  const client = createClient({ baseUrl: homeserverUrl })

  const authDict: { type: string, threepid_creds: { sid: string, client_secret: string } } = {
    type: AuthType.Email,
    threepid_creds: {
      sid,
      client_secret: clientSecret,
    },
  }

  await client.setPassword(
    authDict,
    newPassword,
    logoutDevices,
  )
}

/**
 * Generate a random client secret for 3PID operations.
 */
export function generateClientSecret(): string {
  return crypto.randomUUID()
}
