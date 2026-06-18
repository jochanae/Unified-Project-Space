---
name: Database — Replit built-in Postgres
description: How the DB was migrated to Replit Postgres and gotchas for future schema changes
---

## Current state
- DATABASE_URL now points to Replit's built-in Postgres (set automatically by createDatabase())
- All 28 Drizzle schema tables pushed cleanly as of June 17 2026
- Production Supabase (lmrpnsjckljdwqudtelk) is untouched — still used by Cloud Run / axiomsystem.app

## Drizzle push TTY gotcha
`drizzle-kit push` AND `drizzle-kit push --force` both fail with TTY error when existing tables need interactive decisions (e.g. adding a unique constraint to a table with rows).

**Fix for future schema changes on an existing DB:**
- If it's a clean table (no data), push works fine
- If an existing table needs structural change: use `executeSql` to make the change directly (ALTER TABLE, etc.) rather than relying on drizzle-kit push
- Nuclear option (dev only): `DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;` then plain `push`

**Why:** drizzle-kit's conflict resolver requires an interactive TTY which Replit's bash tool doesn't provide.

**How to apply:** Any time `pnpm --filter @workspace/db run push` hangs or errors with "Interactive prompts require a TTY", use executeSql for targeted ALTER TABLE statements instead.
