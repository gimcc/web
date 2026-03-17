# PLAN-008 Phase 5 — Emoji Reactions (FEAT-015)

- **status**: approved
- **approvedAt**: 2026-03-17
- **createdAt**: 2026-03-17
- **relatedTask**: FEAT-015

---

## 1. Current State

- Message timeline with virtual scrolling is implemented (FEAT-007)
- Text and media message sending/receiving works (FEAT-008, FEAT-009)
- `MessageBubble` component supports hover state via Tailwind `group` class
- `TimelineMessage` interface has no reaction data
- `sync-bridge.ts` only processes `m.room.message` events, ignoring `m.reaction`
- No emoji picker or reaction UI exists

## 2. Proposed Changes

### 2.1 Data Model — Extend `TimelineMessage`

```typescript
// In messages-store.ts
export interface Reaction {
  emoji: string
  senderIds: string[]
}

export interface TimelineMessage {
  // ... existing fields
  reactions?: Reaction[]  // aggregated reactions per emoji
}
```

### 2.2 Store — New Reaction Methods

Add to `MessagesState`:
- `addReaction(roomId, eventId, emoji, senderId)` — add/aggregate a reaction
- `removeReaction(roomId, eventId, emoji, senderId)` — remove a user's reaction

### 2.3 Service — Reaction Service

New file: `packages/matrix-client/src/services/reaction-service.ts`

```typescript
export async function sendReaction(roomId: string, eventId: string, emoji: string): Promise<void>
export async function redactReaction(roomId: string, reactionEventId: string): Promise<void>
```

- `sendReaction`: calls `client.sendEvent(roomId, 'm.reaction', { 'm.relates_to': { rel_type: 'm.annotation', event_id, key: emoji } })`
- `redactReaction`: calls `client.redactEvent(roomId, reactionEventId)` to undo a reaction

### 2.4 Sync Bridge — Handle `m.reaction` Events

Extend `onTimeline` in `sync-bridge.ts`:
- If event type is `m.reaction`, extract `m.relates_to.event_id` and `key`
- Call `useMessagesStore.getState().addReaction(...)` to update the target message
- Handle redaction events to remove reactions

### 2.5 Initial Timeline Loading — Aggregate Existing Reactions

Extend `loadInitialTimeline` and `loadRoomHistory`:
- After loading messages, scan room timeline for `m.reaction` events
- Aggregate reactions into corresponding `TimelineMessage.reactions`

### 2.6 UI Components

#### 2.6.1 Reaction Display — `ReactionBar`

File: `apps/web/src/components/reaction-bar.tsx`

- Renders below message content (inside `MessageBubble`)
- Shows each emoji with count badge: `👍 3  ❤️ 1`
- Highlight if current user has reacted
- Click to toggle own reaction (send or redact)

#### 2.6.2 Emoji Picker — `EmojiPicker`

File: `apps/web/src/components/emoji-picker.tsx`

- Popover triggered by hover action button on message
- Frequent/common emoji grid (no external library — keep it lightweight)
- ~50 common emojis in categories: faces, gestures, hearts, objects
- Search is out of scope for now (can add later)

#### 2.6.3 Message Action Bar

File: `apps/web/src/components/message-actions.tsx`

- Floating bar shown on message hover (top-right corner)
- Buttons: emoji reaction (smiley icon)
- Future-proof: can add reply, thread, more actions later
- Uses existing `group-hover` pattern from `MessageBubble`

### 2.7 Mock Support

Extend `mock-message-service.ts`:
- Add mock reactions to some messages
- Support `sendMockReaction` for testing

## 3. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/matrix-client/src/stores/messages-store.ts` | Modify | Add `Reaction` type, reaction methods |
| `packages/matrix-client/src/services/reaction-service.ts` | New | Send/redact reaction events |
| `packages/matrix-client/src/sync/sync-bridge.ts` | Modify | Handle `m.reaction` and redaction events |
| `packages/matrix-client/src/services/message-service.ts` | Modify | Aggregate reactions on timeline load |
| `packages/matrix-client/src/index.ts` | Modify | Export new reaction functions/types |
| `apps/web/src/components/reaction-bar.tsx` | New | Reaction display below messages |
| `apps/web/src/components/emoji-picker.tsx` | New | Emoji selection popover |
| `apps/web/src/components/message-actions.tsx` | New | Hover action bar on messages |
| `apps/web/src/components/message-bubble.tsx` | Modify | Integrate action bar and reaction bar |
| `packages/matrix-client/src/services/mock-message-service.ts` | Modify | Mock reaction support |

## 4. Risks

| Risk | Mitigation |
|------|------------|
| Reaction events flood on popular messages | Only aggregate reactions for visible messages |
| Redaction tracking complexity | Store reaction eventId per user to enable redaction |
| Emoji picker bundle size | Use inline emoji grid, no external library |
| Race condition: send + receive same reaction | Deduplicate by senderId in aggregation |

## 5. Scope Exclusions

- Full emoji search/keyboard (future enhancement)
- Custom emoji / sticker packs
- Reaction notifications
- Long-press mobile gesture
