# Cinny vs Gim-Web: Message Sync & Rendering Analysis

## 1. Cinny Architecture Overview

### 1.1 Data Flow

```
Matrix Server
    ↓ /sync (long-polling, handled by matrix-js-sdk)
matrix-js-sdk
    ↓ Maintains Room / EventTimeline / EventTimelineSet internally
    ↓ Emits events: RoomEvent.Timeline, RoomEvent.Redaction,
    ↓               RoomEvent.TimelineRefresh, ClientEvent.Sync
React Components (RoomTimeline)
    ↓ Listens to SDK events → setState triggers re-render
    ↓ Reads events directly from SDK's timeline chain
Page Display
```

### 1.2 Sync Layer

- **No custom sync store** — Cinny does NOT maintain its own message store.
  It reads events directly from `matrix-js-sdk`'s `Room.getLiveTimeline()`.
- `startClient({ lazyLoadMembers: true })` starts long-polling.
- `IndexedDBStore` for local persistence (built into SDK).
- `timelineSupport: true` enables timeline linking (forward/backward navigation).

### 1.3 Timeline Data Model

```typescript
type Timeline = {
  linkedTimelines: EventTimeline[];  // Linked chain of timelines (old → new)
  range: ItemRange;                   // Visible window { start, end }
};
```

Key utility functions:
- `getLiveTimeline(room)` — get room's live timeline
- `getLinkedTimelines(timeline)` — traverse both directions to collect full chain
- `getTimelineAndBaseIndex(timelines, index)` — locate specific timeline + relative index from absolute index
- `getEventIdAbsoluteIndex(...)` — reverse-lookup absolute index from eventId

### 1.4 Real-time Message Handling

`useLiveEventArrive` hook listens to:
- `RoomEvent.Timeline` — new messages
- `RoomEvent.Redaction` — deleted messages

When a new event arrives:

**User at bottom:**
1. Shift `range` by +1 (`start+1, end+1`) — window follows
2. Trigger `scrollToBottom` (smooth)
3. Auto `markAsRead` if page is focused

**User NOT at bottom:**
1. Just `setTimeline({...ct})` — trigger re-render without moving range
2. Set `unreadInfo` to show unread indicator

`useLiveTimelineRefresh` — listens to `RoomEvent.TimelineRefresh`, reinitializes when SDK resets timeline.

### 1.5 Pagination

`useTimelinePagination`:
1. Triggered by `useVirtualPaginator`'s `onEnd` callback (when scroll hits placeholder)
2. Calls `mx.paginateEventTimeline(timeline, { backwards, limit: 80 })`
3. For encrypted rooms: `decryptAllTimelineEvent` after pagination
4. `recalibratePagination` recalculates `linkedTimelines` and `range` offset

### 1.6 Virtual Scrolling

Custom `useVirtualPaginator`:
- Maintains `ItemRange` — only renders events within visible window (max `PAGINATION_LIMIT = 80`)
- `IntersectionObserver` on front/back anchors triggers range expansion
- Items rendered by absolute index via `data-message-item` attribute

### 1.7 Event Rendering Pipeline

`eventRenderer` function per item:
1. Locate `MatrixEvent` from absolute index
2. Skip: ignored users, redacted events, reaction/edit relation events
3. Compute **collapse** (same sender + same type + <2 min gap + same day)
4. Insert **day dividers** and **new message dividers**
5. `renderMatrixEvent` dispatches by event type:
   - `m.room.message` → `<Message>` + `<RenderMessageContent>`
   - `m.room.encrypted` → `<Message>` + `<EncryptedContent>` (decrypt then render)
   - `m.sticker` → `<Message>` + `<MSticker>`
   - `m.room.member` → `<Event>` + membership parser
   - Other state events → `<Event>` + generic display
   - Unknown events → only shown when `showHiddenEvents`

### 1.8 Component Hierarchy

```
Room
  └─ RoomView
       ├─ RoomTimeline                    ← Core: timeline state + virtual scroll
       │    ├─ RoomIntro                  ← Room intro at top
       │    ├─ Placeholder (back anchor)  ← Backward pagination trigger
       │    ├─ eventRenderer() × N        ← Per-event rendering
       │    │    ├─ TimelineDivider       ← Date / new-message dividers
       │    │    ├─ Message               ← Regular messages
       │    │    │    ├─ Reply            ← Quote reply
       │    │    │    ├─ RenderMessageContent ← Body (text/image/file/video...)
       │    │    │    └─ Reactions         ← Emoji reactions
       │    │    └─ Event                 ← State events (membership, etc.)
       │    ├─ Placeholder (front anchor) ← Forward pagination trigger
       │    └─ atBottomAnchor            ← Bottom detection anchor
       ├─ RoomViewTyping                  ← Typing indicator
       └─ RoomInput                       ← Message input
```

### 1.9 Key Design Choices

1. **Zero custom store** — timeline data lives in SDK's `Room` object, no duplication
2. **Event-driven updates** — Room events → `setState` → React re-render
3. **Virtual scrolling with bi-directional pagination** — `ItemRange` + `IntersectionObserver`
4. **Timeline chain structure** — SDK's `EventTimeline` is a doubly-linked list, flattened to `linkedTimelines[]` array for absolute indexing
5. **Pre-render decryption** — decrypt events before rendering to avoid flicker
6. **Message collapse** — same sender within 2 minutes → collapsed (no avatar/name)
7. **Day dividers / unread dividers** — computed inline during rendering

---

## 2. Gim-Web Architecture Overview

### 2.1 Data Flow

```
Matrix Server
    ↓ /sync (long-polling, handled by matrix-js-sdk)
matrix-js-sdk
    ↓ Emits events
sync-bridge.ts
    ↓ Converts MatrixEvent → TimelineMessage
    ↓ Routes to Zustand stores
Zustand Stores (useMessagesStore, useRoomsStore, etc.)
    ↓ React subscribes via useStore(selector)
React Components (MessageTimeline)
    ↓ Virtual scroll via @tanstack/react-virtual
Page Display
```

### 2.2 Sync Layer (sync-bridge.ts)

- Listens to `ClientEvent.Sync`, `RoomEvent.Timeline`, `RoomEvent.Receipt`, etc.
- `onSync('PREPARED')`: sync room list, receipts, and reload active room timeline
- `onTimeline`: route events by type:
  - `m.room.encrypted` → wait for `MatrixEventEvent.Decrypted`, then process
  - `m.room.message` → handle edits (`m.replace`), threads (`m.thread`), or append
  - `m.reaction` → `addReaction()`
  - `m.room.redaction` → `removeReactionByEventId()` + `redactMessage()`
- Optimistic message confirmation: detect `~` prefix temp IDs, replace with real IDs

### 2.3 Message Service (message-service.ts)

- `matrixEventToTimelineMessage()` — convert SDK event to app data model
- `loadInitialTimeline(roomId)` — load from SDK live timeline + merge local store extras
- `loadRoomHistory(roomId)` — `client.scrollback(room, 30)` then `setTimeline()`
- `sendTextMessage()` — optimistic message → async send → confirm/fail
- `editMessage()`, `deleteMessage()`, `sendReply()`, `resendMessage()`

### 2.4 State Management (Zustand)

```typescript
interface MessagesState {
  timelines: Map<string, TimelineMessage[]>
  hasMore: Map<string, boolean>
  // Operations: setTimeline, appendMessages, prependMessages,
  //   addOptimisticMessage, confirmMessage, failMessage,
  //   addReaction, removeReaction, updateMessage, redactMessage
}
```

### 2.5 Timeline Component (message-timeline.tsx)

- Subscribes to `useMessagesStore` timelines Map
- Virtual scrolling via `@tanstack/react-virtual`
- Auto-scroll when new messages arrive + user at bottom
- History loading when scrollTop < 200px
- Read receipts sent when at bottom
- Each message rendered as `<MessageBubble>`

---

## 3. Comparison: Issues Found in Gim-Web

### 3.1 CRITICAL: No Bi-directional Timeline Navigation

**Cinny:** Uses SDK's linked `EventTimeline` chain — can navigate forward/backward
through the full history. Supports jumping to any event by ID and paginating
in both directions from that point.

**Gim-Web:** Only has a flat `TimelineMessage[]` array per room. `loadRoomHistory()`
calls `scrollback()` which **replaces the entire timeline** via `setTimeline()`.
No support for:
- Jumping to a specific event (e.g., clicking a reply, or opening a notification link)
- Bi-directional pagination (can only go backward)
- Timeline gaps (when SDK resets timeline)

**Impact:** Cannot implement "jump to message", reply-click navigation, or
notification deep-links.

### 3.2 CRITICAL: `loadRoomHistory` Replaces Entire Timeline

**Cinny:** Pagination adds events to the linked timeline chain and recalibrates
the view range. Existing messages are never lost.

**Gim-Web:** `loadRoomHistory()` reads the **entire** SDK live timeline and calls
`setTimeline()`, which replaces all messages. This means:
- Any live-sync messages not yet in SDK timeline could be lost
- Reactions added via live sync may be overwritten
- The `mergeStoreReactions()` workaround is fragile

**Fix:** Should use `prependMessages()` instead of `setTimeline()` for pagination,
or adopt Cinny's approach of reading directly from SDK timeline.

### 3.3 HIGH: No Timeline Refresh Handling

**Cinny:** Listens to `RoomEvent.TimelineRefresh` — when the SDK resets the
timeline (e.g., after a gap in sync), Cinny reinitializes.

**Gim-Web:** Does not listen to `RoomEvent.TimelineRefresh`. If the SDK resets
the timeline (due to sync gaps, limited timeline, etc.), the UI will show stale
data until the user manually switches rooms.

### 3.4 HIGH: Missing Event Types

**Cinny:** Renders `m.room.message`, `m.room.encrypted`, `m.sticker`,
`m.room.member`, and all state events with graceful fallbacks.

**Gim-Web:** Only handles `m.room.message` in both sync-bridge and rendering.
Missing:
- `m.sticker` — sticker messages
- `m.room.member` — join/leave/invite/ban events
- State events (room name change, topic change, etc.)
- `m.room.encrypted` events that decrypt to non-message types

### 3.5 HIGH: No Message Collapse/Grouping

**Cinny:** Groups consecutive messages from the same sender within 2 minutes —
collapses avatar and username for grouped messages.

**Gim-Web:** Every message rendered identically with full avatar and sender name.
No grouping or collapse logic. Results in visual clutter for rapid conversations.

### 3.6 HIGH: No Day Dividers / Unread Dividers

**Cinny:** Inserts day dividers ("Today", "Yesterday", "March 15, 2026") and
"New Messages" dividers computed inline during rendering.

**Gim-Web:** No date separators or unread markers in the timeline. Users cannot
tell when messages were sent relative to each other across day boundaries.

### 3.7 MEDIUM: Virtual Scrolling Has No Anchor Stability

**Cinny:** Uses `IntersectionObserver` on anchor elements to manage range
expansion. When paginating backward, recalibrates range offsets so the visible
content doesn't jump.

**Gim-Web:** Uses `@tanstack/react-virtual` with `estimateSize: () => 52`.
When `loadRoomHistory()` prepends messages, the scroll position may jump because:
- `setTimeline()` replaces the entire array, changing all indices
- No scroll position preservation logic after prepend
- `estimateSize` is a fixed estimate that may not match actual message heights

### 3.8 MEDIUM: Inefficient Store Subscriptions

**Cinny:** Reads events directly from SDK's Room object — no intermediate store.
State changes are minimal (just range and focusItem).

**Gim-Web:** Subscribes to `useMessagesStore(s => s.timelines)` — this returns
the entire Map, meaning **any room's message update triggers a re-render** of
the active room's timeline. Should use a selector like:
```typescript
useMessagesStore(s => s.timelines.get(roomId))
```

### 3.9 MEDIUM: Fragile Optimistic Message Matching

**Cinny:** Does not use optimistic messages — SDK handles send events and they
appear via the normal `RoomEvent.Timeline` flow.

**Gim-Web:** Uses temp `~local-*` IDs for optimistic messages. The matching in
`sync-bridge.ts` finds the **first** pending message from the current user:
```typescript
const pendingMsg = timeline.find(
  m => m.eventId.startsWith('~') && m.senderId === myUserId && m.status === 'sending',
)
```
If the user sends multiple messages rapidly, this could match the wrong
optimistic message (FIFO assumption may not hold if server reorders).

### 3.10 MEDIUM: No Encrypted Message Event Handling

**Cinny:** Full encryption support — decrypts events before rendering, handles
`m.room.encrypted` events that contain stickers, messages, etc.

**Gim-Web:** `sync-bridge.ts` waits for `Decrypted` event, but only handles
`m.room.message` type after decryption. Encrypted stickers, member events, etc.
are silently dropped.

### 3.11 LOW: No Read Receipt Deduplication at Scroll

**Gim-Web:** Sends read receipt both in `useEffect` (when messages change) and
in `handleScroll` (when near bottom). While `lastSentReceiptRef` prevents
duplicate sends, it doesn't persist across room switches — re-entering a room
may re-send a receipt for an already-read message.

### 3.12 LOW: No "Jump to Latest" When Viewing History

**Cinny:** Shows a floating "Jump to Latest" button when user scrolls up, and
"Jump to Unread" + "Mark as Read" buttons when there are unread messages in a
different part of the timeline.

**Gim-Web:** Has a scroll-to-bottom button, but no "Jump to Latest" that reloads
the live timeline when viewing deep history, and no unread indicators.

---

## 4. Summary: Priority Fixes

| Priority | Issue | Effort |
|----------|-------|--------|
| CRITICAL | Bi-directional timeline navigation / event jumping | Large |
| CRITICAL | `loadRoomHistory` replaces timeline | Medium |
| HIGH | No `RoomEvent.TimelineRefresh` handling | Small |
| HIGH | Missing event types (sticker, member, state) | Medium |
| HIGH | No message collapse/grouping | Medium |
| HIGH | No day dividers / unread dividers | Small |
| MEDIUM | Scroll position instability on prepend | Medium |
| MEDIUM | Inefficient store subscriptions | Small |
| MEDIUM | Fragile optimistic message matching | Small |
| MEDIUM | Incomplete encrypted event handling | Small |
| LOW | Read receipt deduplication | Small |
| LOW | No "Jump to Latest" for deep history | Small |
