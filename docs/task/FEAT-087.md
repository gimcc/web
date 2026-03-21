# FEAT-087 Implement E2EE Trust Model UI

> Priority: P1 | Status: pending | Created: 2026-03-21

## Description

Add verified/unverified device indicators across the application to surface E2EE trust state to users.

## Acceptance Criteria

1. **Member list shield icon** — Each member avatar in `member-list-panel.tsx` shows a shield overlay indicating verification status (green check = all devices verified, yellow = some unverified).
2. **Per-device trust badge** — Each device row in `device-management.tsx` displays a verified/unverified badge with icon.
3. **Room-level trust summary** — Room header shows an aggregate trust indicator (all verified / some unverified) for encrypted rooms.
4. **Enhanced unverified-device-warning** — `unverified-device-warning.tsx` lists specific unverified devices per user with "Verify" action buttons.

## Technical Notes

- Use `matrix-js-sdk` crypto API: `crypto.getUserDeviceInfo()`, `crypto.getDeviceVerificationStatus()`
- Create a verification service in `@matrix-web/matrix-client` package
- Add i18n keys for both `en.json` and `zh-CN.json`
- Reuse existing `EncryptionBadge` patterns (lucide-react Shield/ShieldCheck icons)
