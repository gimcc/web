# FEAT-075 Room Alias Management

## Status: In Progress

## Description
Add room alias management to the room settings dialog, allowing room admins to view, add, remove, and set the canonical (main) alias for a room.

## Requirements
- Display current canonical alias and alternative aliases
- Add new alias (validated format: #alias:server)
- Remove existing aliases
- Set a different alias as the canonical alias
- Requires sufficient power level (state_default, typically 50+)

## Implementation
- New service functions: `getRoomAliases`, `addRoomAlias`, `removeRoomAlias`, `setCanonicalAlias`
- New `AliasEditor` component within room settings
- New "Aliases" tab in room settings dialog
- i18n keys for alias management UI

## Files Modified
- `packages/matrix-client/src/services/room-service.ts`
- `packages/matrix-client/src/index.ts`
- `apps/web/src/components/room/alias-editor.tsx` (new)
- `apps/web/src/components/room/room-settings-dialog.tsx`
- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
