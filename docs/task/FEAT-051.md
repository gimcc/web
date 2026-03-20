# FEAT-051 Implement Emoji Picker Panel

## Status: In Progress

## Description

Replace the basic 64-emoji hard-coded picker with a full-featured emoji picker panel supporting:
- Search with keyword matching
- Category tabs (Smileys, People, Nature, Food, Activities, Travel, Objects, Symbols, Flags)
- Skin tone modifier selection
- Recently used emoji tracking (localStorage)
- Integration with both message-input (inline insert) and message-actions (reactions)

## Implementation

- `apps/web/src/lib/emoji-data.ts` — comprehensive emoji dataset (~800 emojis) with categories and search keywords
- `apps/web/src/hooks/use-recent-emojis.ts` — recent emoji tracking with localStorage persistence
- `apps/web/src/components/emoji-picker.tsx` — full-featured picker component
- Update `message-actions.tsx` to use new picker
- Update `message-input.tsx` to add emoji button that inserts emoji into text
- Add i18n keys for picker UI

## Dependencies

None
