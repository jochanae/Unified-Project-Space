---
name: Atlas Builder Actions (FILE_EDIT capability)
description: Current state of Atlas's file-editing / builder-action capability and what's still missing
---

## What's already built (do not rebuild)

The full diff-first edit flow exists. It works when a GitHub repo is linked to the project.

| Capability | Location |
|---|---|
| `FILE_EDIT` block protocol | `artifacts/api-server/src/routes/chat.ts` — system prompt at line ~581 |
| `LINE_PATCH` (surgical edits) | Same file — FIND/REPLACE blocks for large files |
| `FILE_READ_REQUEST` | Same file — Atlas requests files before editing |
| `DiffViewer` component | `artifacts/atlas-frontend/src/components/code/DiffViewer.tsx` |
| `GitHubPushModal` | `artifacts/atlas-frontend/src/components/workspace/GitHubPushModal.tsx` — wired into `AssistantBubble.tsx` (3 places) |
| FILE_EDIT stream detection | `workspace.tsx` — opens CHANGES tab on FILE_EDIT stream |
| Preview/sandbox rendering | `artifacts/api-server/src/routes/preview.ts` — serves FILE_EDIT as standalone HTML |
| Post-push Vercel poll | `artifacts/api-server/src/routes/deploy.ts` — polls up to 90s after push |
| BUILD lens | `artifacts/api-server/src/lib/atlasKnowledge.ts` — code-first, every answer has FILE_EDIT blocks |

## The flow (already implemented, diff-first by design)

```
User request
  → Atlas proposes FILE_EDIT / LINE_PATCH blocks
  → DiffViewer shows before/after
  → User approves via GitHubPushModal
  → Push to linked repo
  → (optional) Vercel deploy poll
```

Atlas does NOT silently apply. User controls the push gate.

## What's missing

- `FILE_DELETE` — not in the protocol, no verb for it
- `FILE_MOVE` — not in the protocol
- `FILE_CREATE` as a distinct verb — partially covered (FILE_EDIT with a new path shows "New file" badge)
- `BATCH_EDIT` as a verb — implicit only (multiple FILE_EDIT blocks in one response)
- Apply without GitHub — the entire push flow requires a linked GitHub token per project (CONNECTIONS tab)

## Hard constraint

**Everything requires a linked GitHub repo.** Without the token in CONNECTIONS, Atlas can propose edits in chat but the push button is inert. This is the only thing blocking the full "I updated that file" experience.

## Phase ordering (user's stated direction)

1. ✅ Stabilize: project creation, conversation persistence, Master Map, boundaries, Flow
2. → Enable builder actions: FILE_EDIT/LINE_PATCH already live; FILE_DELETE/MOVE still missing
3. → Atlas orchestration: conversation → decisions → plan → edit files → commit → workspace updates

**Why:** The stabilization phase uncovers empty-state bugs and navigation inconsistencies that would mask edit-capability bugs. Fix the shell first.
