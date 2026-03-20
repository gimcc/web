# FEAT-070 Featured Room Recommendations

## Status: In Progress

## Description
Show featured/popular rooms when opening the room directory, before the user starts searching. Displays the most popular rooms by member count from the server.

## Requirements
- Display popular rooms automatically when the directory dialog opens
- Sort by member count (most popular first)
- "Featured" section label above the list
- Seamless transition to search results when user starts typing

## Implementation
- Load top rooms (no query, sorted by member count) on dialog open
- Integrated into the `RoomDirectoryDialog` component from FEAT-069

## Files Modified
- Same files as FEAT-069 (combined implementation)
