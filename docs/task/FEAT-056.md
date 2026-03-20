# FEAT-056: UIA Interactive Authentication

## Status: In Progress

## Description
Implement the Matrix User-Interactive Authentication (UIA) framework. Many sensitive operations require UIA:
- Password changes
- Deleting devices
- Adding 3PIDs

The UIA flow returns 401 with `flows` and `session`, and the client must complete auth stages.

## Implementation
- `packages/matrix-client/src/auth/uia-service.ts` — UIA session management and stage completion
- `apps/web/src/components/uia-dialog.tsx` — modal dialog for UIA prompts
- Support `m.login.password` stage (most common)
- i18n keys for UIA dialog

## References
- Matrix spec: [User-Interactive Authentication](https://spec.matrix.org/v1.13/client-server-api/#user-interactive-authentication-api)
