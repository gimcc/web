# PLAN-011 Phase 7-8: Core Chat Completion & UX Enhancements

- **status**: in-progress
- **createdAt**: 2026-03-18 10:00
- **approvedAt**: 2026-03-18 10:00
- **relatedTask**: FEAT-027 ~ FEAT-045

## Current State

Phases 1-6 core features are complete: auth, rooms, messaging, E2EE, settings, i18n, themes, invites. The chat client needs message operations (edit/delete/reply), room lifecycle management, member system, and UX enhancements.

## Proposal

Parallel implementation using 5 teams with isolated worktrees:

### Team A — Message Operations (FEAT-027, 028, 029)
- Message editing via `m.replace` relation
- Message deletion/recall via event redaction
- Reply/quote via `m.in_reply_to` relation
- Files: message-service, message-bubble, message-actions, messages store, sync-bridge

### Team B — Room Lifecycle (FEAT-032, 033, 034, 042)
- Create public/private rooms
- Join rooms by address/link/directory
- Leave/forget rooms
- Room settings (name, avatar, topic)
- Files: room-service, new dialogs, sidebar, rooms store

### Team C — Member System (FEAT-030, 035, 036, 045)
- @mention autocomplete in message input
- Member management (invite/kick/ban)
- Member list side panel
- Member sorting/filtering
- Files: new member panel, member service, message-input

### Team D — Status Features (FEAT-031, 037, 038, 044)
- Read receipts display
- Reaction statistics viewer
- Message pinning
- Per-room notification level
- Files: message-timeline, new components, rooms store

### Team E — UX Polish (FEAT-039, 040, 041, 043)
- URL preview cards (OG metadata)
- Message search and filtering
- Input drafts per room
- Permission editor (power levels)
- Files: new components, message-input, room settings

## Risk

- Merge conflicts on shared files (message-bubble, sidebar, i18n)
- i18n keys need post-merge deduplication
- All teams add to the same stores — merge order matters

## Resolution Strategy

- Each team works in isolated git worktree
- Merge in order: A → B → C → D → E (resolving conflicts at each step)
- Post-merge: consolidate i18n keys, verify build
