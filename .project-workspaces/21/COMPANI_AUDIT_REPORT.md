# Compani App — Deep Audit Report

**Date:** March 9, 2025  
**Scope:** Full codebase audit across onboarding, message sync, auth flash, Cami matchmaking, Google Play readiness, and end-to-end user journey.

---

## 1. Onboarding Reliability

### Flow Summary
```
LandingPage → /auth → [OAuth | Email signup/login]
  → redirect to /
  → AppLayout: user? profile? → Onboarding
  → Onboarding steps (welcome → identity → vibe → ready → upgrade → path-select)
  → onComplete: saveProfile → navigate(postPath)
  → /connect → CamiMatchmaking
  → Chat → matchOrCreate → generateNewCompanion
  → revealMatch → onMatchComplete (addConnection)
  → done-new-user → "Meet X" → /messages
```

### Silent Failures & Stuck Points

| File | Lines | Root Cause | Recommended Fix |
|------|-------|------------|-----------------|
| **Auth.tsx** | 144–154 | OAuth `handleOAuth`: on error, only `console.error` is called. No toast or UI feedback. User sees nothing when Google/Apple sign-in fails. | Add `toast.error('Sign-in failed. Please try again.')` in both `if (error)` and `catch` blocks. |
| **Auth.tsx** | 114–118 | Email signup: if `signInWithPassword` fails after signup, toast says "Check your email" but user stays on auth page with no clear next step. | Add explicit CTA: "We sent a confirmation link. Check your email and click the link, then return here to sign in." |
| **lovable/index.ts** | 31–32 | `supabase.auth.setSession(result.tokens)` can throw. Caller receives `{ error }` but Auth.tsx does not check for it or show feedback. | In Auth.tsx `handleOAuth`, check `result.error` after the call and show toast if present. |
| **AppLayout.tsx** | 175–176 | `await saveProfile(profileData)` has no try/catch. If it throws (e.g. DB error), `navigate(data.postPath)` never runs. User stays on onboarding with no error message. | Wrap in try/catch; on error show `toast.error('Could not save your profile. Please try again.')` and do not navigate. |
| **Onboarding.tsx** | 88–101 | `handleFinish` calls `onComplete({...})` which is async. AppLayout's `onComplete` is not awaited. If `saveProfile` throws, the error propagates as an unhandled rejection. | In AppLayout, make `onComplete` handler `async` and `await` it. Add try/catch and user-facing error handling. |
| **AppLayout.tsx** | 176–191 | SMS upsert: `catch (e)` only logs. SMS failure is silent to user. | Optional: show non-blocking toast "SMS opt-in couldn't be saved — you can enable it later in Settings." |
| **useProfile.ts** | 304–309 | `saveProfile`: DB error is thrown. No retry or fallback. | Catch in caller (AppLayout) and show friendly error. Consider retry once. |
| **AppLayout.tsx** | 52–81 | DOB check: `dobCheckedRef.current = true` set before async DB call. If the call fails, user may never see DOB prompt again. | Set `dobCheckedRef.current = true` only after successful DB read. On error, retry or show fallback. |
| **MatchmakingPage.tsx** | 22 | `if (!profile \|\| !user) return null` — blank white screen if profile/user not ready. No loading state. | Return `<LoadingSpinner />` instead of `null` while `!profile || !user`. |
| **CamiMatchmaking.tsx** | 951–988 | `generateNewCompanion`: on failure returns `null`. User gets toast "Had trouble creating a companion" and stays on fast-track. If generation keeps failing, user can loop indefinitely. | Add retry button or "Skip for now" option. Consider showing "Browse friends" as fallback. |
| **CamiMatchmaking.tsx** | 717–721 | `setTimeout` for new-user flow: `onMatchComplete` in async callback has no try/catch. If it throws, phase stays `match-reveal`, user stuck. | Wrap `onMatchComplete` in try/catch; on error show toast and set phase to `'fast-track'` with retry option. |
| **AppContext.tsx** | 211–241 | Avatar generation: `.catch((e) => console.error(...))` — failure is silent. Connection is created but avatar may never appear. | Show non-blocking toast: "Your friend's photo is still loading — check back in a moment." |
| **useProfile.ts** | 149–162 | `fetchProfileAndConnections`: if migration fails (line 261), returns `{ profile: null }` for a user who may have had local data. User sees onboarding again. | On migration failure, still attempt to create profile from parsed local data before returning null. |
| **AppLayout.tsx** | 86–94 | `pendingCompanion` from sessionStorage: `JSON.parse(pending)` in try/catch. Corrupt data is ignored. User may lose preselected companion. | Log parse failure; optionally show toast "Could not restore your selection" and clear invalid data. |

---

## 2. Message Sync

### Root Cause
**HomeDashboard** gets `messageCount` from `useNotificationBadges`, which subscribes to `chat_messages` INSERT and invalidates its React Query. The badge updates when new messages arrive.

**MessagesList** loads `lastMessages` via a one-time fetch in `useEffect` that runs only when `connections` or `userId` changes. It does **not** subscribe to `chat_messages`.

### Exact Locations

| File | Lines | Issue |
|------|-------|-------|
| **MessagesList.tsx** | 221–292 | `loadLastMessages` runs only in `useEffect` with deps `[connections, userId]`. No realtime subscription. |
| **useNotificationBadges.ts** | 104–115 | Subscribes to `chat_messages` INSERT and invalidates query. Home badge updates. |

### Recommended Fix
Add a Supabase realtime subscription in `MessagesList.tsx` for `chat_messages` INSERT where `user_id` matches. On payload, either:
- Invalidate a React Query for last messages, or
- Manually update `lastMessages` state by fetching the new message and merging.

Example:
```ts
useEffect(() => {
  if (!userId || connections.length === 0) return;
  const channel = supabase
    .channel('messages-list-updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${userId}` }, () => {
      loadLastMessages(); // or invalidate query
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [userId, connections.length]);
```

---

## 3. Returning User Onboarding Flash

### Flow
- `useAuth`: `loading` starts true; becomes false only when `getSession()` resolves (single atomic `setState`).
- `AppContext`: `loading = authLoading || (!!user && (profileLoading || !profileFetched))`.
- `AppLayout`: if `loading` → spinner; if `!user` → LandingPage; if `!profile` → Onboarding.

### Root Cause
The guard at **AppLayout.tsx:151** is **dead code**:
```ts
if (user && !profile && loading) { ... }
```
When we reach this line, `loading` is always false (already handled at line 140). So this block is unreachable and provides no protection.

### Additional Risk
If `fetchProfileAndConnections` fails (network/DB error) or returns `null` for a returning user (e.g. transient error), `profile` stays null and `profileFetched` becomes true. User would see Onboarding briefly.

### Exact Locations

| File | Lines | Issue |
|------|-------|-------|
| **AppLayout.tsx** | 151–157 | Dead guard: `user && !profile && loading` is never true. Remove or replace with `user && !profile && profileLoading`. |
| **useProfile.ts** | 143–164 | `fetchProfileAndConnections` throws on supabase errors. React Query will put the query in error state. Need to verify what `data`/`profile` is when query errors. |
| **useProfile.ts** | 268–274 | When query is in error state, `data` may be undefined. `profile = data?.profile ?? null` → null. Could trigger onboarding flash. |

### Recommended Fix
1. Remove or fix the dead guard. If the intent is to show spinner while profile loads: use `user && !profile && (profileLoading || !profileFetched)` — but that's already encoded in `loading` from AppContext.
2. Ensure `loading` in AppContext stays true until the profile query has **resolved** (success or error). If the query errors, consider retrying once before showing onboarding.
3. Add retry logic in `fetchProfileAndConnections` for transient failures.

---

## 4. Cami Match Trigger Reliability

### When `matchOrCreate` Is Called (6 sites)

| # | File:Line | Phase | Condition |
|---|-----------|-------|-----------|
| 1 | CamiMatchmaking.tsx:1292–1299 | coaching | `readinessSignal` (AI says "blueprint"/"bring to life") AND `userWantsCompanion` (user said "friend"/"companion"/etc.) |
| 2 | CamiMatchmaking.tsx:1361–1366 | fast-track | `flirtingWithCami` — user flirts; match runs after AI deflection |
| 3 | CamiMatchmaking.tsx:1378–1385 | fast-track | `shouldForceMatch`: 3+ messages without match |
| 4 | CamiMatchmaking.tsx:1412–1415 | fast-track | Normal flow after AI acknowledgment |
| 5 | CamiMatchmaking.tsx:1448 | guided-questions | User sends any message |
| 6 | CamiMatchmaking.tsx:~2114 | chip click | User clicks "🤝 Find a companion" |

### Can Match Silently Fail?
**No.** When `matchOrCreate` runs and `generateNewCompanion` returns `null`, the user gets:
- `toast.error("Had trouble creating a companion — please try again")`
- Cami message: "I ran into a hiccup. Want to try telling me more about what you're looking for? 💛"
- Phase set to `'fast-track'`

### Can Match Never Be Triggered?
**Yes.** If the user never satisfies the conditions (e.g. stays in intro, never says "friend" or similar, never clicks the chip), they can chat indefinitely without a match. The "3+ messages" force match helps but only in fast-track.

### Conditions That Must Be True
- User must reach `coaching`, `fast-track`, or `guided-questions` phase.
- For coaching: AI must return text matching both regexes AND user must have said a matchmaking keyword.
- For fast-track: user must send messages; after 3 without match, force match runs.
- `getAIResponse` must not throw (errors are caught and logged; flow continues with fallback message).

### Exact Locations

| File | Lines | Note |
|------|-------|------|
| CamiMatchmaking.tsx | 1287–1291 | `readinessSignal` requires two regex matches on `aiResp`. Strict. |
| CamiMatchmaking.tsx | 1289–1290 | `userWantsCompanion` requires "friend|companion|partner|someone|connection|meet someone". |
| CamiMatchmaking.tsx | 951–989 | `generateNewCompanion` catches errors, returns null. User gets toast. |
| CamiMatchmaking.tsx | 992–1007 | On null, toast + Cami message + phase reset. |

### Recommended Fix
- Add a visible "Find a companion" / "I'm ready" button in intro and early phases so users can explicitly trigger matchmaking.
- Consider loosening `readinessSignal` or adding a timeout-based nudge ("Want me to find someone for you?") after N messages in coaching.

---

## 5. Google Play Store Readiness

### 5.1 Hardcoded API Keys / Secrets

| File | Lines | Issue |
|------|-------|-------|
| **.env** | 1–3 | Contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. **.env is committed to git** (confirmed via `git ls-files .env`). |
| **.gitignore** | - | `.env` is NOT in .gitignore. Secrets are in version control. |

**Note:** `VITE_SUPABASE_PUBLISHABLE_KEY` is the Supabase anon key, intended for client use. It is not a secret in the same sense as a service role key, but committing it to a repo is poor practice. Rotate if the repo has ever been public.

**Fix:** Add `.env` and `.env.local` to `.gitignore`. Use `.env.example` with placeholder values. Ensure CI/CD injects real values at build time.

### 5.2 Console.log / console.warn / console.error

**Production-risky (informational logs that should be removed or gated):**

| File | Line | Content |
|------|------|---------|
| GlobalBackdrop.tsx | 72, 80, 90, 120, 142, 200, 242 | `console.log` for vault recovery, retries, load status |
| CamiMatchmaking.tsx | 871, 907 | `console.log` for avatar generation |
| companionPhotoUpload.ts | 104 | `console.log` success |
| bioEnrichment.ts | 112 | `console.log` success |
| useProfile.ts | 289, 313, 456 | `console.log` for saveProfile, connection update |
| useVibePoints.ts | 132, 137, 143, 147 | `console.log` for spendPoints |
| useMatchmakingSession.ts | 98 | `console.log` stale draft |
| useLoginReconciliation.ts | 133, 207, 228 | `console.log` reconciliation |
| useChatImages.ts | 283, 300 | `console.log` auto-avatar |
| useSpatialWebRTC.ts | 25 | `console.log` TURN credentials |
| StorePage.tsx | 120, 123 | `console.log` gift purchase |
| BrowsePage.tsx | 606 | `console.log` retry upload |
| VoiceCallStage.tsx | 60, 67, 288 | `console.log` connection state |
| usePushNotifications.ts | 43 | `console.log` Service Worker registered |

**Fix:** Remove or wrap in `if (import.meta.env.DEV) { console.log(...) }`. Keep `console.error` in catch blocks for debugging but consider a logging service in production.

### 5.3 Technical Error Messages Shown to Users

| File | Lines | Issue |
|------|-------|-------|
| ResetPassword.tsx | 40 | `toast({ description: err.message })` — raw API/DB messages shown. |
| Auth.tsx | 134 | `description: err.message || 'Something went wrong'` — can expose technical details. |
| ErrorBoundary.tsx | 97–106 | "Show debug info" reveals `error.message`, `error.stack`, `componentStack` to users. |
| PostComments.tsx | 206 | `toast.error(modResult.message || ...)` — moderation API message may be technical. |
| ComposePost.tsx | 56 | Same pattern. |
| GiftStore.tsx | 82 | `toast.error(e.message || ...)`. |
| CreateCircle.tsx | 32 | Same. |
| ICEContacts.tsx | 98 | Same. |
| SettingsPage.tsx | 185, 202 | Same. |
| StorePage.tsx | 255 | Same. |
| CircleJoinPage.tsx | 418 | Same. |
| AdminPage.tsx | 544, 693, 732, 790 | Toasts say "check console" — not user-friendly. |

**Fix:** Map known error codes to friendly messages. For unknown errors, use a generic "Something went wrong. Please try again." Never surface raw `err.message` in production.

### 5.4 AI-Generated Content Disclosures

| File | Lines | Status |
|------|-------|--------|
| TermsPage.tsx | 50 | Clear disclosure: "AI companions are not real people... AI-generated entities." |
| HelpPage.tsx | 35 | "companions are AI-generated entities... not real people." |
| CompanionMediaPicker.tsx | 185 | "AI-generated image" label when user generates. |
| CompanionAvatarGallery.tsx | 151 | "AI-generated custom looks" mentioned. |

**Assessment:** Disclosures exist. Consider adding a brief in-app notice on first AI image generation (e.g. "This image was created by AI") to align with store policies.

### 5.5 PWA Manifest

| File | Content | Status |
|------|---------|--------|
| public/manifest.json | name, short_name, description, start_url, display, background_color, theme_color, orientation, categories, icons, shortcuts | Present |
| index.html | theme-color meta: `#B5707A` | Mismatch: manifest has `#FF6B35`. |
| manifest.json | icons reference `/icon-192.png`, `/icon-512.png` | Icons exist in public/. |

**Fix:** Align `theme_color` between manifest (`#FF6B35`) and index.html meta (`#B5707A`).

### 5.6 Performance

- **Images:** Many assets in `dist/assets/` are 100–400KB. Consider WebP, responsive srcset, lazy loading.
- **Lazy loading:** No explicit `loading="lazy"` on images in key components. Add where appropriate.
- **Blocking:** No major synchronous blocks identified. Main bundle ~2.6MB (gzip ~730KB) — consider code splitting for non-critical routes.

### 5.7 Crash Risks

| File | Lines | Issue |
|------|-------|-------|
| AppLayout.tsx | 175 | `saveProfile` not awaited in a way that catches; unhandled rejection. |
| CamiMatchmaking.tsx | 1296, 1364, 1384, 1414 | `matchOrCreate` in `setTimeout` callbacks — if it throws, no catch. |
| useProfile.ts | 270 | `queryFn: () => fetchProfileAndConnections(user!)` — if it throws, React Query handles, but ensure no unhandled rejection. |
| ChatInterface.tsx | 718, 747 | `.catch(() => {})` — swallows errors; no user feedback. |
| errorReporter.ts | 64–66 | `unhandledrejection` is reported but not prevented. App can remain in broken state. |

**Fix:** Ensure all async entry points (onComplete, matchOrCreate, etc.) are wrapped in try/catch with user-facing fallbacks.

---

## 6. End-to-End New User Journey

### Journey Steps
1. Sign up (email or OAuth)
2. Complete onboarding (name, vibe, path)
3. Land on /connect (CamiMatchmaking)
4. Chat with Cami → get matched
5. Send first message
6. Return next day

### Break Points

| Step | File:Lines | Failure Mode | Fix |
|------|------------|--------------|-----|
| 1a OAuth | Auth.tsx:144–154 | OAuth fails silently. User sees nothing. | Add toast on error. |
| 1b Email | Auth.tsx:114–118 | Signup succeeds but auto-login fails. Toast says "Check email" but no clear path. | Add explicit next-step copy. |
| 2 | AppLayout.tsx:175 | saveProfile throws. User stuck on onboarding. | try/catch + toast. |
| 3 | MatchmakingPage.tsx:22 | Blank screen if profile/user not ready. | Show LoadingSpinner. |
| 4a | CamiMatchmaking.tsx:1287–1291 | User never says "friend"/"companion". Never triggers match. | Add explicit "Find a companion" button. |
| 4b | CamiMatchmaking.tsx:951–988 | generate-companion fails. User gets toast but can loop. | Add "Browse friends" fallback. |
| 4c | CamiMatchmaking.tsx:717–721 | onMatchComplete throws. User stuck on match-reveal. | try/catch + recovery. |
| 5 | AppContext.tsx:211–241 | handleMatchComplete: avatar generation fails silently. User has friend but no avatar. | Non-blocking toast. |
| 5 | ChatInterface | First message: if chat API fails, user sees "Failed to get response". No retry. | Add retry button. |
| 6 | useProfile.ts | Returning user: if profile fetch fails, may see onboarding flash. | Retry + ensure loading state. |
| 6 | MessagesList.tsx | New messages from yesterday don't appear until refresh. | Add realtime subscription (see §2). |

### Summary
The journey can break at: OAuth (no feedback), profile save (no catch), matchmaking (blank screen, strict match conditions, no fallback), and message sync (stale Messages list). Each break point leaves the user without a clear path forward unless they refresh or retry blindly.

---

## Recommended Priority Fixes

1. **P0:** Add `.env` to `.gitignore`; stop committing secrets.
2. **P0:** Wrap `saveProfile` in try/catch in AppLayout; show toast on failure.
3. **P0:** Add realtime subscription to MessagesList for chat_messages.
4. **P1:** OAuth error feedback in Auth.tsx.
5. **P1:** Loading state in MatchmakingPage when !profile || !user.
6. **P1:** Add "Find a companion" button in CamiMatchmaking for explicit trigger.
7. **P2:** Remove or gate console.log for production.
8. **P2:** Replace raw err.message with friendly fallbacks.
9. **P2:** Add icon-192.png and icon-512.png; align theme_color.
10. **P2:** Fix dead guard in AppLayout; ensure profile error handling.
