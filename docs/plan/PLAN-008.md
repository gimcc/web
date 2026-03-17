# PLAN-008 Direct Chat Implementation

> Status: Approved | Created: 2026-03-17

## Context

All rooms currently display as group rooms. Users need the ability to initiate direct (1-on-1) conversations using Matrix's `is_direct` flag.

## Approach

### 1. Room Service (`packages/matrix-client/src/services/room-service.ts`)

- `findExistingDirectRoom(userId)` — check `m.direct` account data for existing DM
- `createDirectRoom(userId)` — create room with `is_direct: true`, invite user, update `m.direct` account data

### 2. New Direct Chat Dialog (`apps/web/src/components/new-direct-chat-dialog.tsx`)

- Modal dialog triggered from sidebar
- Text input for Matrix user ID (e.g., `@user:server.com`)
- Validates format, shows loading state, handles errors
- On success: closes dialog, selects new room

### 3. Sidebar Update

- Add "New Chat" (pencil/edit) icon button in sidebar header
- Opens the new direct chat dialog

### 4. Room List Sections

- Split room list into "Direct Messages" and "Rooms" sections
- Each section sorted by recent activity
- Collapsible section headers with counts

## Risks

- Race condition: user creates DM while sync delivers the same room → mitigated by checking existing rooms first
- User ID validation: only format check, actual existence verified by server on invite

## Estimate

Small — ~6 files changed/created
