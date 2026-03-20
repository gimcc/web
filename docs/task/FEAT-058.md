# FEAT-058: Token Login

## Status: In Progress

## Description
Implement token-based login (`m.login.token`) for Matrix. This is used by:
- SSO callback flows
- External authentication systems
- Cross-signing verification redirects

## Implementation
- Add `loginWithToken` to `packages/matrix-client/src/auth/auth-service.ts`
- Add `loginWithToken` action to auth store
- Support `?loginToken=<token>&homeserver=<url>` URL parameters
- i18n keys for token login status

## References
- Matrix spec: [Token-based login](https://spec.matrix.org/v1.13/client-server-api/#token-based)
