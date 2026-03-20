# FEAT-047 Implement contact info management (email/phone with 3PID verification)

## Status: Done

## Summary

Added contact information management to the Account settings panel, allowing users to view, add, and remove email addresses and phone numbers via the Matrix 3PID API.

## Changes

### matrix-client package
- `packages/matrix-client/src/services/account-service.ts` — new service with 3PID functions: `getThreePids`, `requestEmailToken`, `requestMsisdnToken`, `addThreePid`, `deleteThreePid`
- `packages/matrix-client/src/index.ts` — re-exported new service functions and types

### web app
- `apps/web/src/components/settings/contact-info-settings.tsx` — new component with email/phone listing, add flows with verification, and delete
- `apps/web/src/components/settings/panels/account-panel.tsx` — integrated `ContactInfoSettings` into Account panel
- `apps/web/src/i18n/locales/en.json` — added `contact_info.*` keys
- `apps/web/src/i18n/locales/zh-CN.json` — added `contact_info.*` keys
