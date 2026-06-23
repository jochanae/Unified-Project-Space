---
name: Real-Time Collaboration
description: Innovation-tier presence + cursors + field locking on Build Stream — uses Supabase Realtime channels and field_locks table
type: feature
---

Real-time collaboration is gated to Innovation tier (`tier === 'growth'`). Surfaces:
- **Build Stream** (active): live avatars, remote cursors, and field locks on editable headline/subheadline/CTA/subtext.

Architecture:
- `field_locks` table (org-scoped, 30s TTL) + `acquire_field_lock` / `release_field_lock` RPCs
- Realtime channel topic: `${orgId}.collab-${projectId}-${surface}` for presence + cursor broadcast (throttled 20fps)
- Realtime postgres_changes on `field_locks` for live lock awareness
- Auto-refresh held locks every 20s; release all on unmount
- Color per user is deterministic (hash of userId → 8-color HSL palette)

Files:
- `src/features/collab/` — hooks (`use-collab-presence`, `use-field-lock`), components (`CollabAvatars`, `CursorOverlay`, `FieldLockIndicator`)
- `src/features/pages/components/LandingPagePreview.tsx` — `EditableText` accepts `lockKey` + `fieldLockApi`
- `src/features/quinn/components/BuildStream.tsx` — wired

Future expansion: Page Builder + Funnels project view use the same hooks with different `surface` keys.
