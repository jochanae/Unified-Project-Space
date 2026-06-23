# Compani Storage Policy

This document defines where different types of data live. Follow this every time
you add new state. Drift from this policy is the #1 source of "my data disappeared"
bugs and session loss issues.

---

## The Rule

| Where | What goes here | What does NOT go here |
|---|---|---|
| **Supabase DB** | Anything that must survive reinstall, device change, or logout/login | Temporary UI state |
| **localStorage** | Long-lived user preferences that should survive closing the app | Anything that should reset per-session |
| **sessionStorage** | In-progress flow drafts (survive remount, gone on tab close) | Persistent data of any kind |
| **React state** | Transient UI state (loading, open/closed, current tab) | Anything that needs to outlive the component |

---

## Current assignments

### Supabase (source of truth)
- All user memories (`memories` table)
- Companion facts (`companion_facts` table)
- Journal entries, mood checkins, gratitude entries
- Connections, profiles, chat messages
- Plans, reminders, goals
- Matchmaking sessions (`matchmaking_sessions` table)

### localStorage (long-lived preferences)
- `compani-memory` — user memory cache (mirror of Supabase, for fast chat context)
- `compani-haptic-enabled` — haptic preference
- `compani-sfx-enabled` — sound effects preference
- `compani-theme` — dark/light mode
- `circle-companion-{id}` — companion selection per circle

### sessionStorage (in-progress flows only)
- `compani-journal-draft` — journal entry being written
- `compani-think-draft` — Think Freely input being typed
- `compani-think-history` — Think Freely conversation (cleared on End Session)
- `compani-journal-mode` — which tab is active in journal (write vs think)
- `presenceContext` — presence moment context for next chat message

### React state (component lifetime only)
- All UI open/close states (sheets, modals, drawers)
- Loading and error states
- Form inputs not listed above

---

## Adding new state — decision checklist

1. Does it need to survive reinstalling the app? → **Supabase**
2. Does it need to survive closing the tab but not reinstall? → **localStorage**
3. Is it a draft for something the user is actively doing right now? → **sessionStorage**
4. Will it reset naturally when the user navigates away? → **React state**

---

## Cleanup rule
When a flow completes (user submits, cancels, or ends session), clean up sessionStorage:
```ts
sessionStorage.removeItem('compani-think-history');
sessionStorage.removeItem('compani-think-draft');
```
Never leave sessionStorage keys orphaned — they accumulate and cause stale-state bugs.
