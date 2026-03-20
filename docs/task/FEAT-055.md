# FEAT-055: Password Reset (Email Verification)

## Status: In Progress

## Description
Implement password reset flow using email verification as defined by the Matrix spec:
1. User enters email address
2. Client requests email token via `POST /_matrix/client/v3/account/password/email/requestToken`
3. User clicks link in email
4. Client submits new password via `POST /_matrix/client/v3/account/password`

## Implementation
- `packages/matrix-client/src/auth/password-reset-service.ts` — password reset API calls
- `apps/web/src/pages/login/forgot-password-page.tsx` — multi-step reset UI
- Update login page with "Forgot password?" link
- i18n keys for all reset flow steps

## References
- Matrix spec: [Account password change](https://spec.matrix.org/v1.13/client-server-api/#post_matrixclientv3accountpassword)
