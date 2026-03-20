# FEAT-046 Implement user profile editing (avatar upload + display name change)

## Status: Done

## Summary

Add user profile editing to the settings dialog, allowing users to change their display name and upload/remove their avatar.

## Changes

### New files
- `packages/matrix-client/src/services/profile-service.ts` — Profile API service (get/set display name, upload/remove avatar, get shared rooms)
- `apps/web/src/components/settings/panels/profile-panel.tsx` — Profile editing panel in settings

### Modified files
- `packages/matrix-client/src/index.ts` — Export profile service functions
- `apps/web/src/components/settings/settings-dialog.tsx` — Add Profile tab (default)
- `apps/web/src/i18n/locales/en.json` — English i18n keys for profile
- `apps/web/src/i18n/locales/zh-CN.json` — Chinese i18n keys for profile

## Features
- View and edit display name with save button
- Upload avatar from file picker (image files)
- Remove avatar
- Loading states and error/success feedback
- i18n support (en + zh-CN)
