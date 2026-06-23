---
name: Google OAuth local setup
description: Google OAuth is wired in google-auth.ts; uses dynamic redirect URI from x-forwarded-host header
---

## Setup
- Route file: `artifacts/api-server/src/routes/google-auth.ts`
- Secrets required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (set as Replit secrets)
- Redirect URI registered in Google Console: `https://ed44264d-634d-4def-a16a-4b52206356dd-00-4xui1ou1xage.janeway.replit.dev/api/auth/google/callback`

## Dynamic redirect URI
The backend derives the redirect URI from `x-forwarded-host` and `x-forwarded-proto` headers, so dev and prod both work with one Google Cloud project — just add both redirect URIs in Google Console.

## Diagnostic endpoint
`GET /api/auth/google/redirect-uri` — returns the exact URI the server will use for the current request context. Use this to verify what to register in Google Console.

**Why dynamic:** Avoids needing separate Google Cloud projects or env-specific config for dev vs prod redirect URIs.
