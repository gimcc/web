# FEAT-048 Implement device management (view/delete login sessions)

## Status: Done

## Summary

Added device/session management to the Account settings panel, allowing users to view all login sessions, rename devices, and delete remote sessions.

## Changes

### matrix-client package
- `packages/matrix-client/src/services/account-service.ts` — added device functions: `getDevices`, `deleteDevice`, `deleteDevices`, `renameDevice`
- `packages/matrix-client/src/index.ts` — re-exported device service functions and `DeviceInfo` type

### web app
- `apps/web/src/components/settings/device-management.tsx` — new component showing device list with current device badge, inline rename, and delete for remote sessions
- `apps/web/src/components/settings/panels/account-panel.tsx` — integrated `DeviceManagement` into Account panel
- `apps/web/src/i18n/locales/en.json` — added `devices.*` keys
- `apps/web/src/i18n/locales/zh-CN.json` — added `devices.*` keys
