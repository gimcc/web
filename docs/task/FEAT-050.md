# FEAT-050 Implement user profile card (details, management actions, shared rooms)

## Status: Done

## Summary

Add a user profile card dialog that shows user details, management actions, and shared rooms. Accessible by clicking on members in the member list panel.

## Changes

### New files
- `apps/web/src/components/profile/user-profile-card.tsx` — User profile card dialog component

### Modified files
- `apps/web/src/components/members/member-list-panel.tsx` — Make members clickable to open profile card
- `apps/web/src/i18n/locales/en.json` — English i18n keys for profile card
- `apps/web/src/i18n/locales/zh-CN.json` — Chinese i18n keys for profile card

## Features
- Show user avatar (large), display name, and user ID
- "Send Message" button to start/open DM (for other users)
- List of shared rooms with click-to-navigate
- Loading state and error handling
- Self-profile detection (hides DM button for own profile)
- i18n support (en + zh-CN)
