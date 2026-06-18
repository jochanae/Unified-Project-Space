---
name: API base URL and sync-protected files
description: api.ts DEFAULT_API_BASE must stay empty string; certain files are protected from GitHub sync overwrites
---

## Rule
`artifacts/atlas-frontend/src/lib/api.ts` DEFAULT_API_BASE must always be `""` (empty string).

**Why:** When set to the Cloud Run URL, `apiUrl()` calls (including the Google OAuth button's `window.location.href`) redirect to production Cloud Run instead of the local Replit backend. The empty string causes all API calls to go through the Replit proxy to local Express.

**How to apply:** If a sync ever reverts api.ts, immediately set DEFAULT_API_BASE back to `""`.

## Sync-protected files (scripts/sync-frontend.sh skip list)
- `vite.config.ts` — Replit-patched (PORT/BASE_PATH + workspace alias)
- `src/lib/api.ts` — API base override for local backend

Both are checked by basename/relpath in the sync script and skipped when GitHub has a different version.
