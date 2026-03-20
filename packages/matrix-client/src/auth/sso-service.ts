import { createClient } from 'matrix-js-sdk'

export interface SsoIdentityProvider {
  id: string
  name: string
  icon?: string
  brand?: string
}

export interface LoginFlowsResult {
  supportsPassword: boolean
  supportsSso: boolean
  supportsToken: boolean
  ssoProviders: SsoIdentityProvider[]
}

/**
 * Fetch supported login flows from a homeserver.
 */
export async function getLoginFlows(homeserverUrl: string): Promise<LoginFlowsResult> {
  const client = createClient({ baseUrl: homeserverUrl })
  const response = await client.loginFlows()

  let supportsPassword = false
  let supportsSso = false
  let supportsToken = false
  const ssoProviders: SsoIdentityProvider[] = []

  interface SsoLoginFlow {
    type: string
    identity_providers?: Array<{
      id: string
      name: string
      icon?: string
      brand?: string
    }>
  }

  for (const flow of response.flows as SsoLoginFlow[]) {
    if (flow.type === 'm.login.password') {
      supportsPassword = true
    }
    if (flow.type === 'm.login.sso') {
      supportsSso = true
      const idps = flow.identity_providers

      if (idps) {
        for (const idp of idps) {
          ssoProviders.push({
            id: idp.id,
            name: idp.name,
            icon: idp.icon,
            brand: idp.brand,
          })
        }
      }
    }
    if (flow.type === 'm.login.token') {
      supportsToken = true
    }
  }

  return { supportsPassword, supportsSso, supportsToken, ssoProviders }
}

/**
 * Build the SSO redirect URL for a given provider.
 */
export function buildSsoRedirectUrl(
  homeserverUrl: string,
  redirectUrl: string,
  idpId?: string,
): string {
  const base = `${homeserverUrl}/_matrix/client/v3/login/sso/redirect`
  const url = idpId ? `${base}/${encodeURIComponent(idpId)}` : base
  return `${url}?redirectUrl=${encodeURIComponent(redirectUrl)}`
}

/**
 * Start the SSO login flow by redirecting to the homeserver.
 */
export function startSsoLogin(
  homeserverUrl: string,
  redirectUrl: string,
  idpId?: string,
): void {
  const url = buildSsoRedirectUrl(homeserverUrl, redirectUrl, idpId)
  window.location.href = url
}
