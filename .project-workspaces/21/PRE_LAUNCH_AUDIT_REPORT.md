# Pre-Launch Codebase Audit Report

## 1. Broken Imports / Dead Code

### Broken Imports
- **None found.** All imports reference existing files.

### Unused Components
- **None found.** All imported components are used.

### Dead Files (never imported — flag only, do not delete)
| File | Notes |
|------|-------|
| `src/pages/ThreadsPage.tsx` | Never routed in `App.tsx`; `/threads` renders `FeedPage`, not `ThreadsPage`. File exists as a minimal stub (BookOpen icon, title, description). |

---

## 2. Route Integrity

All routes in `App.tsx` have corresponding page components that exist:

| Route | Page Component | Status |
|-------|----------------|--------|
| `/auth` | Auth.tsx | ✓ |
| `/reset-password` | ResetPassword.tsx | ✓ |
| `/terms` | TermsPage.tsx | ✓ |
| `/privacy` | PrivacyPage.tsx | ✓ |
| `/help` | HelpPage.tsx | ✓ |
| `/blog`, `/blog/:slug` | BlogPage.tsx | ✓ |
| `/` (index) | HomePage.tsx | ✓ |
| `/threads` | FeedPage.tsx | ✓ |
| `/messages` | MessagesPage.tsx | ✓ |
| `/favorites` | FavoritesPage.tsx | ✓ |
| `/settings` | SettingsPageRoute.tsx | ✓ |
| `/browse` | BrowsePage.tsx | ✓ |
| `/pricing` | PricingPage.tsx | ✓ |
| `/vault` | VaultPage.tsx | ✓ |
| `/wardrobe` | WardrobePage.tsx | ✓ |
| `/wellness` | WellnessPage.tsx | ✓ |
| `/plans` | PlansPage.tsx | ✓ |
| `/chat/:memberId` | ChatPage.tsx | ✓ |
| `/profile/:username` | PublicProfilePage.tsx | ✓ |
| `/connect` | MatchmakingPage.tsx | ✓ |
| `/studio` | StudioPage.tsx | ✓ |
| `/store` | StorePage.tsx | ✓ |
| `/story` | StoryPage.tsx | ✓ |
| `/world` | WorldPage.tsx | ✓ |
| `/my-world` | MyWorldPage.tsx | ✓ |
| `/circles` | CirclesPage.tsx | ✓ |
| `/circles/join/:code` | CircleJoinPage.tsx | ✓ |
| `/circles/:id/lobby` | CircleLobbyPage.tsx | ✓ |
| `/circles/:id` | CircleChatPage.tsx | ✓ |
| `/admin` | AdminPage.tsx | ✓ |
| `/admin/feedback` | AdminFeedbackPage.tsx | ✓ |
| `/beta-feedback` | BetaFeedbackPage.tsx | ✓ |
| `/resting` | RestingPage.tsx | ✓ |
| `/threads/join/:code` | ThreadsJoinPage.tsx | ✓ |
| `*` (catch-all) | NotFound.tsx | ✓ |

No routes point to stub or empty components. `ThreadsPage.tsx` exists but is never routed.

---

## 3. Supabase Edge Functions

**Invoke calls:** All `supabase.functions.invoke()` calls reference functions that exist in `/supabase/functions/`:
- `chat`, `moderate-content`, `check-subscription`, `create-checkout`, `create-payment`, `customer-portal`, `delete-user`, `elevenlabs-conversation-token`, `extract-chat`, `generate-backstory`, `generate-avatar`, `gift-checkout`, `ice-alert`, `journal-prompts`, `notify-signin-feedback`, `send-parental-consent-email`, `send-push-notification`, `turn-credentials`, `circle-reply`, `companion-image`

**Fetch URLs:** All `fetch()` calls to Supabase function URLs match existing functions:
- `get-voices`, `companion-voice`, `elevenlabs-transcribe`, `companion-image`, `companion-comment`, `generate-companion-post`, `chat`, `web-search`, `generate-avatar`, `journal-prompts`, `elevenlabs-scribe-token`, `transcribe-audio`, `extract-memories`, `extract-companion-facts`, `consolidate-memories`, `extract-reminders`, `extract-plans`, `generate-presence-moment`, `moderate-content`, `moderate-image`, `generate-event-post`

All functions exist.

---

## 4. Environment Variables

### Frontend (`import.meta.env.VITE_*`)
| Variable | In .env? | Used In |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | ✓ | Many files |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✓ | Many files |
| `VITE_SENTRY_DSN` | ✓ | sentry.ts |
| `VITE_SUPABASE_PROJECT_ID` | ✓ | Not used in src (only in replit.md, COMPANI_AUDIT_REPORT.md) |

All frontend env vars are documented. `VITE_SUPABASE_PROJECT_ID` exists in `.env` but is unused in code.

### Edge Functions (`Deno.env.get()`)
These must be configured in Supabase secrets:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase)
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `TOGETHER_AI_API_KEY`
- `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `PERPLEXITY_API_KEY`
- `TWILIO_*` (SMS, TURN, ice-alert), `VAPID_*` (push), `LOVABLE_API_KEY`
- `ADMIN_EMAIL`, `SITE_URL` (optional fallbacks)

**Note:** `supabase/functions/extract-plans/index.test.ts` uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`—these are Vite env vars; Deno tests may need them set in a local `.env` or equivalent for the test to run.

---

## 5. Age / Safety Gates

### Mature Mode
- **Settings:** Mature Mode toggle only shown when `isPremium && isAdult(profile.dateOfBirth)`. Minors never see it.
- **Chat flame toggle:** Only shown when `subscribed && isAdult(profile.dateOfBirth)`.
- **DB trigger:** `enforce_mature_mode_age_gate` prevents `mature_mode = true` if DOB is null or user is under 18.
- **Chat edge function:** Server-side verification of `mature_mode` + `date_of_birth` before enabling mature model.

### Kids-Companion Role
- **RolePickerDialog:** Filters `kids-companion` for minors only (`isMinor`); adults get `romantic` but not `kids-companion`.
- **Chat role dropdown:** Adults can select `kids-companion`; the model receives the kids-companion role block (safe content).
- **Chat edge function:** `kids-companion` receives explicit safety guardrails; `showMatureUpsell` is false for kids-companion.

### Romantic Content
- Romantic option hidden for minors via `!treatAsMinor(profile?.dateOfBirth)` in ChatInterface.
- Gift Store filters `adultOnly` items and hides lingerie category for minors via `userIsAdult18`.
- Store `deliverGiftToChat` uses `isMatureMode` only when `profile?.matureMode` (already gated by age).

### Minor Gap (Warning)
- **Chat role dropdown (lines 1511–1536):** Adults can select `kids-companion`; minors cannot select `romantic`. The kids-companion option appearing for adults is safe (model behaves kid-safe) but inconsistent with RolePickerDialog which filters it out for adults. Consider aligning behavior.

---

## 6. Console Errors and TypeScript

### TypeScript
- `tsc --noEmit` passes with no errors.

### `@ts-ignore` / `as any`
Many `as any` usages exist (~100+). High-risk examples:
- `useProfile.ts:116` — `(dbProfile as any).mature_mode` (profile type mismatch)
- `VoiceCallStage.tsx:192, 223, 438` — ElevenLabs SDK `conversation` object
- `ChatInterface.tsx:285` — `(supabase as any)` (Supabase from())
- `CommunityFeed.tsx` — Multiple `(data as any[])` for feed/post types
- `CircleJoinPage.tsx` — `circle_guests as any` (RLS/table types)
- `LobbyConfigEditor.tsx:79` — `(supabase as any).from('circle_lobby_config')` (possibly untyped table)

Most are on DB responses or SDKs. Review those that affect auth, profile, or moderation for potential bugs.

---

## 7. COPPA / Play Store Readiness

### Parental Consent Email
- **Auth signup path:** Under-13 requires `parentEmail`; `send-parental-consent-email` is invoked after signup (Auth.tsx lines 126–131).
- **AppLayout WelcomeSetup:** If `!profile.dateOfBirth`, user sees WelcomeSetup; under-13 collects `parentEmail` and invokes `send-parental-consent-email` (lines 248, 326).
- **AppLayout under-13 gate:** `under13AwaitingConsent` shows waiting screen until parental consent.

Parental consent email fires on the Auth signup path and on WelcomeSetup for users without DOB.

### Date of Birth Required Before Onboarding
- **AppLayout:** If `!profile.dateOfBirth`, WelcomeSetup blocks until DOB (and parent email for under-13) is collected.
- **Auth signup:** DOB required; validated at lines 81–101.
- **WelcomeSetup / DobPromptDialog:** DOB required before continuing.
- **Onboarding:** Only reached after DOB is set (WelcomeSetup runs first when DOB is missing).

`date_of_birth` is required before onboarding completes.

### Minor Gap (Warning)
- **Onboarding.tsx:** Sets `onboarding_completed` without an explicit DOB check; the flow assumes WelcomeSetup has already collected DOB. Legacy users without DOB may be auto-patched to `onboarding_completed: true` in AppLayout (lines 343–344). DobPromptDialog and WelcomeSetup still gate users without DOB. Recommend verifying no path can set `onboarding_completed` before DOB is stored.

---

# Summary by Severity

## Critical (blocks launch)
- **None**

## Warning (should fix)
1. **Chat role dropdown:** Adults can select kids-companion; minors cannot select romantic. Align with RolePickerDialog or document intent.
2. **`as any` usage:** Many casts on profile, Supabase, and SDK objects; review for type-safety and schema alignment.
3. **ThreadsPage.tsx:** Unused; `/threads` routes to FeedPage. Remove or wire correctly.

## Minor (post-launch OK)
1. **VITE_SUPABASE_PROJECT_ID:** In .env but unused in frontend.
2. **Dead file:** ThreadsPage.tsx never imported or routed.
3. **Edge function tests:** extract-plans/index.test.ts uses VITE_* vars in Deno; ensure local test env is configured.
4. **RolePromptTester:** Uses matureMode for admin testing; acceptable for admin-only flows.
