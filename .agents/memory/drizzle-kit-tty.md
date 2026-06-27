---
name: Drizzle-kit TTY limitation
description: drizzle-kit push fails silently when creating new tables in non-TTY environments; workaround is raw SQL in ensureColumns()
---

## The Rule

Never rely on `drizzle-kit push` (run as a child process from the API server) to create **new tables**. It requires an interactive TTY for conflict resolution prompts and will fail silently (exit 0, log "applied cleanly") when no TTY is available — leaving the table uncreated.

**Why:** drizzle-kit 0.31.x detects existing-vs-new table conflicts and surfaces an interactive prompt (rename/create/skip). Without a TTY, it throws internally but still exits 0 in some cases, making the failure invisible.

**How to apply:** Any time a new table is added to the schema:
1. Add raw SQL `CREATE TABLE IF NOT EXISTS ...` to the `ensureColumns()` function in `artifacts/api-server/src/index.ts`
2. This runs **after** `await pushSchema()` and `await ensureColumns()` — in sequence, guaranteed
3. The CREATE TABLE IF NOT EXISTS is fully idempotent — safe to run on every boot
4. Format: match column names exactly to the Drizzle schema (snake_case, same types)

## Pattern

```typescript
// In ensureColumns() in artifacts/api-server/src/index.ts:
try {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS my_new_table (
      id serial PRIMARY KEY,
      project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      ...
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  logger.info("ensureColumns: my_new_table verified");
} catch (err) {
  logger.warn({ err }, "ensureColumns: my_new_table failed — server will start anyway");
}
```

## Existing tables (already seeded via this pattern)

- `application_models` — added in Application Model Phase 2A
- `application_model_history` — added in Application Model Phase 2A
- `drill_cache` column on `project_flow_canvas` — predates this pattern, same approach
