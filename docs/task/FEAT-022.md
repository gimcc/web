# FEAT-022 Implement Direct Chat Creation

> Priority: P1 | Status: In Progress | Created: 2026-03-17

## Description

Add the ability to create and start direct (1-on-1) chats using the Matrix `is_direct` flag. Currently all rooms default to group display. This feature enables users to initiate private conversations with specific users.

## Acceptance Criteria

- [ ] Users can start a new direct chat from the sidebar via a "New Chat" button
- [ ] A dialog allows entering a Matrix user ID to start a DM
- [ ] The system checks for existing DM rooms before creating duplicates
- [ ] New DM rooms are created with `is_direct: true` flag via Matrix API
- [ ] Room list separates direct messages and group rooms into sections
- [ ] After creating a DM, the room is auto-selected and ready for messaging

## Technical Notes

- Uses `MatrixClient.createRoom()` with `is_direct: true` and `invite: [userId]`
- Sets `m.direct` account data to track DM mappings
- Reuses existing DM detection logic (`getDMInviter`, `guessDmUserId`)
- New `room-service.ts` in `packages/matrix-client/src/services/`

## Dependencies

- FEAT-005 (Matrix client connection) ✅
- FEAT-006 (Room list & sidebar) ✅
