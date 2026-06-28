---
name: Project DNA Layers
description: creative_principles and experience_intent columns added to application_models; extraction + builder injection pattern
---

## Rule
`application_models` now has two Project DNA JSONB columns:
- `creative_principles` (JSONB array) — accumulate-never-delete, deduped by normalised text
- `experience_intent` (JSONB object) — overwritten per sub-field on each extraction pass

**Why:** Separate persistence and merge strategies reflect the fundamentally different nature of these two layers — principles are permanent commitments, experience intent is a living brief.

**How to apply:**
- Any new extraction pass should respect the accumulate vs overwrite distinction
- Builder injection reads these before every response and inserts a PROJECT DNA block only when non-empty
- The AM GET endpoint (serializeModel) already returns both fields
- ensureColumns() in index.ts is the migration path — no drizzle-kit migration needed
