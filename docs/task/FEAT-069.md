# FEAT-069 Public Room Browser (by Server)

## Status: In Progress

## Description
Implement a full-featured public room browser that allows users to browse and search public rooms on any Matrix homeserver, not just the user's own server.

## Requirements
- Browse public rooms on the user's homeserver by default
- Allow specifying a custom server to browse rooms from
- Paginated results with "load more" support
- Show room name, topic, member count, avatar initial
- Click to join a room directly from the browser
- Integrate into the sidebar as an "Explore" button

## Implementation
- New `browsePublicRooms` service function with server parameter and pagination
- New `RoomDirectoryDialog` component with server selector
- i18n keys for en.json and zh-CN.json
- Explore button in sidebar header

## Files Modified
- `packages/matrix-client/src/services/room-service.ts`
- `packages/matrix-client/src/index.ts`
- `apps/web/src/components/compose/room-directory-dialog.tsx` (new)
- `apps/web/src/components/sidebar.tsx`
- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
