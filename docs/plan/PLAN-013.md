# PLAN-013 E2EE Trust Model UI

> Date: 2026-03-21 | Task: FEAT-087 | Status: draft

## Current State

- `EncryptionBadge` component exists with `encrypted`/`verified`/`unencrypted` states
- `UnverifiedDeviceWarning` is a static placeholder (no device list, no verify actions)
- `DeviceManagement` lists devices but shows no trust/verification status
- `MemberListPanel` shows role icons but no verification indicators
- Room header has no trust summary
- `crypto-bridge.ts` handles verification request events but no device trust queries
- matrix-js-sdk crypto API available: `getUserDeviceInfo()`, `getDeviceVerificationStatus()`

## Proposal

### Layer 1 — Service (`@matrix-web/matrix-client`)

Create `services/verification-service.ts`:
- `getDeviceVerificationStatus(client, userId, deviceId)` → `'verified' | 'unverified' | 'unknown'`
- `getUserDevices(client, userId)` → `DeviceTrustInfo[]` (deviceId, displayName, verified)
- `getRoomTrustSummary(client, roomId)` → `{ totalDevices, verifiedDevices, allVerified }`
- `requestDeviceVerification(client, userId, deviceId)` → initiate SAS flow

Export from package index.

### Layer 2 — React Hook

Create `hooks/use-device-trust.ts` in web app:
- `useUserDeviceTrust(userId)` → `{ devices: DeviceTrustInfo[], loading }`
- `useRoomTrustSummary(roomId)` → `{ summary, loading }`

### Layer 3 — UI Components

#### 3a. Member list shield (member-list-panel.tsx)
- Add small shield overlay on each member's avatar
- Green `ShieldCheck` = all devices verified, Yellow `Shield` = some unverified
- Query trust per user lazily (on mount / scroll into view)

#### 3b. Device trust badge (device-management.tsx)
- Add verified/unverified badge next to each device name
- Green `ShieldCheck` + "Verified" / Yellow `ShieldAlert` + "Unverified"
- Add "Verify" button for unverified non-current devices

#### 3c. Room trust summary (chat-layout.tsx room header)
- Small indicator next to room name showing aggregate trust
- `ShieldCheck` green "All verified" or `ShieldAlert` yellow "Some unverified"
- Only shown for encrypted rooms

#### 3d. Enhanced unverified-device-warning.tsx
- Accept `roomId` prop, fetch all room members' devices
- Group unverified devices by user
- Each device row shows device name, device ID, and "Verify" button
- "Verify" button opens `DeviceVerificationDialog`

### Layer 4 — i18n

Add keys to `en.json` and `zh-CN.json` under `trust` namespace.

## Risks

- **Performance**: Querying device trust for all room members could be slow in large rooms → mitigate with lazy loading and caching
- **Crypto API availability**: Rust crypto must be initialized → guard with `client.getCrypto()` checks

## Effort

Medium — ~6 files modified, ~2 new files created.

## Alternatives

1. Only show trust at room level (simpler but less granular) — rejected, user wants per-device visibility
2. Use polling instead of on-demand queries — unnecessary complexity
