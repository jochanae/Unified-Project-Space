---
name: Extraction fire-and-forget confirmation
description: Server log proof that extractAndUpdateApplicationModel survives client disconnects; CORS regex that broke multi-level Replit preview domains
---

## The rule
`extractAndUpdateApplicationModel` is genuinely fire-and-forget. Client disconnecting from the SSE stream does NOT abort extraction.

## Evidence from server log (June 27, 2026)
- `POST /api/chat` → status 200, `request aborted` after 18,559ms (client disconnected)
- `applicationModelExtraction: applied` logged 68 seconds after request start, 50 seconds after client disconnect
- Field applied: `intent` for projectId 53

## Why it survives
1. `extractAndUpdateApplicationModel` is `async` — always returns a Promise, never synchronously throws
2. The entire function body is wrapped in `try/catch` — all errors logged as `warn`, never rethrown
3. Call site uses `void fn(...).catch(err => logger.warn(...))` — double guard
4. Extraction fires AFTER `writeSSEDone(res)` — the response stream is closed before extraction starts

## CORS regex bug (fixed June 27, 2026)
Old: `/^https:\/\/[^.]+\.replit\.(dev|app)$/` — only matched single-subdomain Replit domains
New: `/^https:\/\/([a-z0-9-]+\.)+replit\.(dev|app)$/` — matches any depth (e.g. `abc.janeway.replit.dev`)

**Why:** Actual Replit preview URLs are two-level subdomains like `<hash>.janeway.replit.dev`. The old regex rejected them, which could cause CORS failures for cross-origin POSTs from the preview iframe.

## "Something went wrong" root cause
The first workspace chat attempt (17:29:39) failed at the network level before reaching Express — never logged. Likely a race where `doSend` fired before the session was fully initialized. The second attempt (17:32:15) worked correctly. "Something went wrong" shown to user was from the first transient failure, not from extraction.
