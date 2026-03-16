import type { AuthCredentials, AuthSession } from './auth-service'

const MOCK_DELAY = 300

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createMockSession(credentials: AuthCredentials): AuthSession {
  return {
    userId: `@${credentials.username}:localhost`,
    accessToken: `mock_${crypto.randomUUID()}`,
    deviceId: `MOCK_${Date.now()}`,
    homeserverUrl: credentials.homeserverUrl,
  }
}

export async function mockLogin(credentials: AuthCredentials): Promise<AuthSession> {
  await delay(MOCK_DELAY)
  return createMockSession(credentials)
}

export async function mockRegister(credentials: AuthCredentials): Promise<AuthSession> {
  await delay(MOCK_DELAY)
  return createMockSession(credentials)
}
