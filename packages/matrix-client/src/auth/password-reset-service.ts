import { createClient } from 'matrix-js-sdk'

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

  await client.setPassword(
    {
      type: 'm.login.email.identity',
      threepid_creds: {
        sid,
        client_secret: clientSecret,
      },
      threepidCreds: {
        sid,
        client_secret: clientSecret,
      },
    } as never,
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
