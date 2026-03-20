# FEAT-049 Implement ignore user (blocklist management)

## Status: Done

## Summary

Added ignored users (blocklist) management to the Account settings panel, allowing users to view, add, and remove users from their ignore list.

## Changes

### matrix-client package
- `packages/matrix-client/src/services/account-service.ts` — added ignore functions: `getIgnoredUsers`, `ignoreUser`, `unignoreUser`
- `packages/matrix-client/src/index.ts` — re-exported ignore service functions

### web app
- `apps/web/src/components/settings/ignored-users-settings.tsx` — new component with ignored user list, add form with user ID validation, and unignore action
- `apps/web/src/components/settings/panels/account-panel.tsx` — integrated `IgnoredUsersSettings` into Account panel
- `apps/web/src/i18n/locales/en.json` — added `ignored_users.*` keys
- `apps/web/src/i18n/locales/zh-CN.json` — added `ignored_users.*` keys
