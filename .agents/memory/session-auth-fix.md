---
name: Session auth fix — App.tsx bearer token bypass
description: App.tsx session-expired check used raw fetch without bearer token, causing false 401 logouts
---

## The bug
App.tsx had a session-expiry guard that used `_originalFetch` (un-patched fetch) with a full absolute URL:
```js
const baseUrl = API_BASE || window.location.origin;
const check = await _originalFetch(`${baseUrl}/api/auth/me`, { credentials: "include" });
```
When API_BASE is `""`, baseUrl became `window.location.origin` (full https:// URL). The `_originalFetch` (install-api-fetch.ts shim) only attaches bearer tokens to paths starting with `/api/`, not to full https:// URLs. Result: the check fired without a bearer token, always got 401, and kicked users back to login.

## The fix
Changed to a relative URL with manual bearer header:
```js
const authToken = (() => { try { return localStorage.getItem("atlas-auth-token"); } catch { return null; } })();
const check = await _originalFetch(`/api/auth/me`, { credentials: "include", headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
```

**Why:** Relative `/api/auth/me` is recognized by install-api-fetch.ts as an API call, and the bearer token is added. Even without the shim, the manual header ensures the token is sent.

**How to apply:** If session drops appear after a sync, check this spot in App.tsx first.
