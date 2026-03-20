# FEAT-054: SSO Single Sign-On

## Status: In Progress

## Description
Implement SSO (Single Sign-On) login flow for Matrix homeservers that support it. This includes:
- Detecting available SSO identity providers via `GET /_matrix/client/v3/login`
- Opening SSO login in a popup/redirect flow
- Handling the callback with the login token
- Completing authentication with `m.login.token`

## Implementation
- `packages/matrix-client/src/auth/sso-service.ts` — SSO flow logic
- `apps/web/src/pages/login/sso-button.tsx` — SSO provider buttons
- Update login page to show SSO options when available
- i18n keys for SSO-related UI text

## References
- Matrix spec: [SSO login](https://spec.matrix.org/v1.13/client-server-api/#sso-client-login)
