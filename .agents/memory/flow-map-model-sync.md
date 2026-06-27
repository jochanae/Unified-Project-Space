---
name: Flow Map → model-synced
description: How Flow Map canvas stays in sync with Application Model pages/entities
---

## Rule
Flow Map canvas nodes with `data.source === "application-model"` are owned by
`syncFlowCanvasFromModel()` in `applicationModel.ts`. Never manually create or
delete these nodes — let the sync function manage them.

**Why:** Stage 2B established the AM as canonical source of truth. The Flow Map
is a *projection* of `AM.pages` and `AM.data.entities/relationships` — not an
independent store.

## How to apply
- To add/remove pages or entities from the Flow Map: patch the AM (`pages` or
  `data` fields) — the PATCH route auto-triggers a merge sync.
- To call sync explicitly (e.g. on first project load): POST
  `/api/projects/:id/model/sync-flow` — now idempotent, safe to repeat.
- User-placed nodes (no `source` tag) are NEVER overwritten by sync.
- `syncFlowCanvasFromModel` is exported for use in other routes if needed.

## Node ID scheme
- Pages: `am-page-{page.id}`
- Entities: `am-entity-{entity.id}`
- Edges: `am-rel-{relationship.id}`
