# FEAT-082 matrix.to Deep Link Handling

## Status: In Progress

## Description
Handle matrix.to deep links (https://matrix.to/#/...) to navigate to rooms, users, or specific messages within the application.

## Requirements
- Parse matrix.to URLs: rooms (#room:server), users (@user:server), events (!room:server/$eventId)
- Handle deep links on app startup (URL parameters)
- Handle deep links clicked within message content
- Auto-join room if not already joined
- Navigate to the room after processing

## Implementation
- New `parseMatrixToUrl` and `handleMatrixLink` utility functions
- Deep link handler hook `useDeepLinkHandler`
- Message content link interception
- Router integration for `/room/:roomIdOrAlias` path

## Files Modified
- `packages/matrix-client/src/utils/matrix-link.ts` (new)
- `packages/matrix-client/src/index.ts`
- `apps/web/src/hooks/use-deep-link.ts` (new)
- `apps/web/src/pages/chat/chat-layout.tsx`
- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
