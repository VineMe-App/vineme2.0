# Events and cross-church network

> **Summary.** Phase 2. Code for events exists but is hidden from users. Keep the code, but don't build on it until phase 2 starts ([roadmap](../../product/roadmap.md)).

- **Status:** Phase 2. Built but hidden.
- **Apps:** mobile
- **Last verified against code:** 2026-11-22

## What exists

| What | Where |
| --- | --- |
| Tables | `events`, `categories` (initial schema migration) |
| Screens | `apps/mobile/src/app/(tabs)/events.tsx`, `apps/mobile/src/app/event/[id].tsx` |
| Hidden from the tab bar | `href: null` in `apps/mobile/src/app/(tabs)/_layout.tsx` |
| Friends | `friendships` table and `apps/mobile/src/app/friends.tsx`. They exist in the app but do little yet |

## Phase 2 vision

Events, and a network that links people across churches. Friend relationships are the likely starting point. _TODO: write up the vision when phase 2 planning starts._
