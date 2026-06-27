---
name: Ledger AM Field Tagging
description: entries.am_field column — how Ledger decisions reference Application Model fields
---

## Rule
Every committed Decision entry must declare `amField` (the AM field it most directly relates to). Defaults to `"intent"` when unknown. The AM history bridge in entries.ts uses this field as `fieldChanged` in application_model_history.

**Why:** Phase 2B Ledger migration — Ledger must be a projection of AM, not a free-floating log. Each entry now self-declares its relationship to the canonical model.

**How to apply:**
- Valid field values: `"identity"`, `"identity.audience"`, `"identity.positioning"`, `"intent"`, `"intent.purpose"`, `"pages"`, `"data"`, `"data.entities"`, `"logic"`, `"buildState"`
- Default is always `"intent"` when no specific field is known
- `CreateEntryBody` accepts `am_field` (snake_case from HTTP, maps to `amField` in DB)
- New columns go in `ensureColumns()` in index.ts — drizzle-kit push does NOT run reliably in non-TTY (Replit) environments; always add `ADD COLUMN IF NOT EXISTS` there
- Boot backfill ran: 45 pre-existing entries tagged with `am_field = 'intent'`
