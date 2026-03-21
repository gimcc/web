# FEAT-089 Rewrite E2EE crypto module (SSSS + cross-signing + key backup + verification)

- **status**: done
- **priority**: P0
- **owner**: unassigned
- **createdAt**: 2026-03-21 14:00

## Description

The current E2EE crypto module has critical design flaws that make SSSS, cross-signing, and device verification non-functional. This task rewrites the crypto module by referencing Cinny's implementation and the official matrix-js-sdk documentation.

### Core Problems

1. **Fragmented bootstrap flow** — SSSS, cross-signing, and key backup are separate UI operations, but they MUST be a single ordered flow: SSSS → cross-signing → key backup
2. **No UIA handling** — `authUploadDeviceSigningKeys` passes empty `{}`, fails on servers requiring authentication
3. **No new-device verification** — No UI to enter recovery key/passphrase to load existing cross-signing keys on a new device
4. **No cache clearing before bootstrap** — Stale cached keys can interfere with setup
5. **No recovery key validation** — No `checkKey()` call before using recovery credentials
6. **getSecretStorageKey callback can hang indefinitely** — No timeout or cancellation mechanism

### Acceptance Criteria

1. Single unified "Setup Device Verification" flow: creates recovery key → bootstraps SSSS → bootstraps cross-signing (with UIA) → creates key backup
2. New device verification via recovery key or passphrase (ManualVerification)
3. Proper UIA interactive auth handling for cross-signing key upload
4. Recovery key/passphrase validation with `secretStorage.checkKey()` before use
5. Reset flow with proper warnings
6. All existing E2EE status indicators remain functional
7. Cross-signing ready returns true after successful setup
8. Secret storage ready returns true after successful setup

## Dependencies

- **supersedes**: FEAT-088 (SSSS — incomplete/broken)
- **blocked by**: FEAT-012 (E2EE foundation — done)

## Notes

Related plan: PLAN-015
Reference: Cinny `DeviceVerificationSetup.tsx`, `ManualVerification.tsx`, `SecretStorage.tsx`
