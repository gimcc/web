import { z } from 'zod'

const wellKnownSchema = z.object({
  'm.homeserver': z.object({
    base_url: z.string().url(),
  }),
  'm.identity_server': z.object({
    base_url: z.string().url(),
  }).optional(),
})

export interface WellKnownResult {
  homeserverUrl: string
  identityServerUrl?: string
}

/**
 * Discover the homeserver URL for a given domain using .well-known.
 * @param domain - The domain to discover (e.g., "matrix.org")
 * @returns The resolved homeserver URL, or null if discovery fails
 */
export async function discoverHomeserver(domain: string): Promise<WellKnownResult | null> {
  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')

  const url = `https://${normalizedDomain}/.well-known/matrix/client`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const parsed = wellKnownSchema.safeParse(data)

    if (!parsed.success) {
      return null
    }

    return {
      homeserverUrl: parsed.data['m.homeserver'].base_url.replace(/\/+$/, ''),
      identityServerUrl: parsed.data['m.identity_server']?.base_url.replace(/\/+$/, ''),
    }
  }
  catch {
    return null
  }
}

/**
 * Check if a string looks like a domain (not a full URL).
 */
export function isDomainInput(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return false
  }
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)
}
