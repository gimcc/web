# FEAT-053 Implement Sticker Sending

## Status: In Progress

## Description

Support sending and rendering `m.sticker` events:
- Create sticker service for sending sticker events
- Sticker picker integrated into message input area
- Stickers sourced from custom emoji packs (im.ponies) that contain sticker-sized images
- Special rendering for sticker messages (larger, no bubble wrapper)

## Implementation

- `packages/matrix-client/src/services/sticker-service.ts` — sendSticker function
- `apps/web/src/components/sticker-picker.tsx` — sticker picker panel
- `apps/web/src/components/sticker-message.tsx` — sticker rendering in timeline
- Update `message-bubble.tsx` to detect and render stickers specially
- Update `message-input.tsx` to add sticker button
- Export new service from matrix-client index.ts
- Add i18n keys

## Dependencies

- FEAT-052 (custom emoji packs provide stickers)
