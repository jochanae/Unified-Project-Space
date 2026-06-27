---
name: Application Model Phase 2A
description: What was built, where it lives, and how the Application Model API works
---

## What exists

Two tables, one set of routes, boot-time seeding. Nothing reads from these tables yet — Phase 2B wires existing systems into them.

## Tables

**`application_models`** — one row per project (unique FK)
- `version`: integer, increments on every PATCH
- `identity`: JSONB — name, purpose, audience, category
- `intent`: JSONB — summary, coreProblems[], keyOutcomes[], constraints[], approvedAt
- `pages`: JSONB[] — id, name, route, description, layout, children[]
- `components`: JSONB[] — id, name, pageId, description, props{}, children[]
- `data`: JSONB — `{ entities: [], relationships: [] }`
- `logic`: JSONB[] — id, name, type(rule/flow/state-machine), description, triggers[], actions[]
- `buildState`: JSONB — generated, generatedAt, deployedAt, deployUrl, generatedFileCount

**`application_model_history`** — append-only version log
- `model_version`: version number at time of change
- `field_changed`: which top-level field was updated
- `previous_value` / `new_value`: JSONB snapshots
- `reason`: optional text explanation

## Routes

All behind `requireAuth` + `assertProjectOwner`.

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/projects/:id/model` | Returns model; auto-creates empty one if missing |
| PATCH | `/api/projects/:id/model` | Updates named fields, increments version, writes history rows |
| GET | `/api/projects/:id/model/history` | Returns last 200 history entries, newest first |

PATCH body: any subset of `{ identity, intent, pages, components, data, logic, buildState, reason }`. Validated by `ApplicationModelPatchSchema`.

## Boot-time seeding

`seedMissingApplicationModels()` runs non-blockingly on boot. Creates one empty Application Model row for every project that doesn't have one. All existing projects were seeded on first run.

## Key files

- `lib/db/src/schema/application_model.ts` — Drizzle schema + full Zod type suite
- `artifacts/api-server/src/routes/applicationModel.ts` — all three routes + `getOrCreateApplicationModel()` + `seedMissingApplicationModels()`
- `artifacts/api-server/src/index.ts` — raw SQL CREATE TABLE in `ensureColumns()` (drizzle-kit TTY workaround), seed call after boot sequence

## Phase 2B (next)

Genome, Ledger, Plans, and Flow Map become projections of the Application Model. Each field in those systems gets a canonical home in the Application Model and the old system becomes a computed view.
