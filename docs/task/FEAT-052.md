# FEAT-052 Implement Custom Emoji Pack Management

## Status: In Progress

## Description

Support Matrix custom emoji packs using the `im.ponies.user_emotes` and `im.ponies.room_emotes` state events:
- Read custom emoji packs from user account data and room state
- Display custom emojis in the emoji picker as additional tabs
- Cache emoji pack data in a Zustand store

## Implementation

- `packages/matrix-client/src/services/custom-emoji-service.ts` — service to read/manage emoji packs
- `packages/matrix-client/src/stores/emoji-store.ts` — Zustand store for caching emoji packs
- Update emoji picker to show custom emoji tabs
- Export new service from matrix-client index.ts
- Add i18n keys

## Dependencies

- FEAT-051 (emoji picker panel)
