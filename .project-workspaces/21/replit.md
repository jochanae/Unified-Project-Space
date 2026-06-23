# Compani — AI Companion App

## Overview
Compani is a full-stack AI companion web application migrated from Lovable. It features AI-powered conversations, a community feed, wellness tools, and private circles.

## Architecture
- **Frontend**: React + TypeScript + Vite (client-side SPA)
- **Backend**: Express server serving the Vite frontend (server/)
- **Database/Auth/Storage**: Supabase (external service)
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: React Router DOM v6
- **State Management**: TanStack React Query + React Context (AppContext)
- **Animations**: Framer Motion
- **Toast**: Sonner
- **i18n**: i18next + react-i18next + browser language detection
- **Error Tracking**: Sentry (optional, no DSN configured yet)

## Project Structure
```
client/src/
  App.tsx              - Main app with React Router routes + ErrorBoundary
  main.tsx             - Entry point (inits i18n, Sentry, global error reporter)
  index.css            - Custom CSS with Tailwind + theme tokens
  assets/              - Images (avatars, browse characters, etc.)
  components/          - All React components
    ui/                - Shadcn-based UI primitives
    landing/           - Landing page sections
    circle/            - Circle-related components
      types.ts         - Shared types: Participant, CircleType
      SpatialRoom.tsx  - Self-contained spatial room (floating orbs, P2P WebRTC video)
      CanvasRoom.tsx   - Self-contained canvas room (LiveKit video grid)
    admin/             - Admin dashboard components
  contexts/AppContext.tsx - Global app state provider
  hooks/               - Custom React hooks (auth, profile, chat, etc.)
    useSpatialAudio.ts   - Browser-only mic/VAD hook for Spatial Room (no LiveKit)
    useSpatialWebRTC.ts  - P2P WebRTC video via Supabase Realtime signaling
    useSpatialCompanions.ts - Room-scoped companion engine for Spatial Room
    useCompanionEngine.ts   - Room-scoped companion engine for Canvas Room
    useCircleAudio.ts    - Audio/VAD hook used by Canvas Room
  i18n/                - Internationalization config + locale files
  integrations/
    supabase/          - Supabase client + types
    lovable/           - Lovable OAuth integration
  layouts/AppLayout.tsx - Main app layout (header, footer, sidebar)
  lib/                 - Utility functions (errorReporter, sentry, etc.)
  pages/
    CircleChatPage.tsx - Thin routing layer: loads circle metadata, renders SpatialRoom or CanvasRoom
server/
  index.ts             - Express server entry point
  routes.ts            - API routes (minimal - most logic is client-side)
  vite.ts              - Vite middleware setup
  storage.ts           - In-memory storage (not used by Compani)
script/
  github-pull.mts      - Script to pull latest code from GitHub repo
```

## Circles Architecture (Decoupled Rooms)
The Circles feature has two fully independent room types:

### Spatial Room (SpatialRoom.tsx)
- Floating orb UI with physics, drag-to-move, firefly particles
- **Video**: Peer-to-peer WebRTC via `useSpatialWebRTC` (Supabase Realtime Broadcast for signaling)
- **Audio**: Browser-native mic + VAD via `useSpatialAudio` (no LiveKit dependency)
- **Companions**: Self-contained via `useSpatialCompanions`
- Designed for small groups (up to ~5 peers, mesh topology)
- Room types: social, personal, kids

### Canvas Room (CanvasRoom.tsx)
- Video tile grid/stage layout (Zoom-like)
- **Video**: LiveKit-based video conferencing
- **Audio**: `useCircleAudio` hook
- **Companions**: Self-contained via `useCompanionEngine`
- Designed for larger meetings, lectures, services
- Room types: circle, service, community

### CircleChatPage.tsx (thin router)
- Fetches circle metadata, determines room type (spatial vs canvas)
- Renders shared UI: header bar, info panel, race overlays, presentation dialog, transcript sheet
- Does NOT own audio, companion, or video state (rooms are self-contained)
- Companion AI responses auto-trigger via message watching effects inside each room's hook

## Key Features
- AI companion chat with memory
- Community feed and posts
- Private circles (group chats) with lobby, spatial room, voice
- Wellness hub
- Browse/matchmaking companions
- Gift store
- User profiles with avatars
- Favorites/moments
- Admin dashboard
- Circle lobby and join pages

## Push Notifications
- **VAPID keys** generated and stored as env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- Frontend reads public key from `VITE_VAPID_PUBLIC_KEY` env var (no hardcoded key)
- Server-side push endpoints in `server/routes.ts`:
  - `POST /api/push/send` — send to a specific subscription
  - `POST /api/push/send-to-user` — send to all subscriptions for a user (looks up from Supabase `push_subscriptions` table)
  - `GET /api/push/vapid-key` — returns the public key
- Service worker (`client/public/sw.js`) handles push events and notification clicks
- Subscription flow: browser → service worker registration → PushManager.subscribe → store in Supabase
- Uses `web-push` npm package for server-side delivery

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID
- `VITE_VAPID_PUBLIC_KEY` - VAPID public key for push notifications (frontend)
- `VAPID_PUBLIC_KEY` - VAPID public key (server)
- `VAPID_PRIVATE_KEY` - VAPID private key (server)
- `VAPID_SUBJECT` - VAPID subject (mailto: URI)

## Design System
- Dark mode primary theme (deep midnight: hsl 225 25% 8%)
- Gold primary color (hsl 43 72% 53%)
- Fonts: Nunito (sans), Quicksand (display), Playfair Display (serif)
- Border radius: 0.875rem

## Important Notes
- The app uses Supabase for ALL data persistence (profiles, connections, messages, etc.)
- Auth flows through Supabase Auth (email/password + Google OAuth via Lovable)
- The DobPromptDialog (date of birth) only shows for new users who haven't submitted DOB
- Returning users skip the DOB prompt via localStorage flag `compani-dob-submitted`
- The home dashboard shows the first non-archived connection as the active companion
- GitHub source repo: jochanae/compani (main branch) — use script/github-pull.mts to sync
- CSS loads fonts via <link> in index.html (no @import in CSS)
- LiveKit packages installed for Canvas Room voice features
- SpatialRoom uses NO LiveKit — fully browser-native WebRTC
- Each room's companion hook auto-triggers responses when human messages arrive (no explicit onHumanMessage call needed from parent)
- Spatial world scale: base 5x viewport (social), kids 12.5x; spawn spread radius 0.10-0.42
- Joystick orb speed: 0.007 (social), 0.012 (kids); camera follows via 15% lerp interpolation
- Camera toggle: CircleChatPage camOn prop → SpatialRoom → useSpatialWebRTC.startVideo/stopVideo with error rollback
- Demo account: demo@compani-test.com / DemoTest2026! (user_id: 1f9726e8-3412-452d-b6ad-70bc110f1c79)
- Dashboard backdrop buttons only show when hasCompanion (active companion connection required)

## Stability Fixes Applied (14 issues)
### Critical (Fixed)
1. **Store checkout** — sends all cart items array + uses redirect instead of popup
2. **VP purchase rollback** — if DB purchase record fails, points are refunded via `addPoints`
3. **VP reward rates unified** — `VP_REWARDS` in `useVibePoints.ts` is single source of truth; removed duplicate `VP_EARN_RATES` from `giftInventory.ts`; Store UI reads from `VP_REWARDS` constants
4. **Voice audio memory leak** — `useChatVoice` tracks active audio + blob URLs, cleans up on unmount, revokes URLs on interruption
### Moderate (Fixed)
5. **Ghost audio** — `AudioMessagePlayer` stops audio + cancels animation frame on unmount
6. **VP init race condition** — `useVibePoints` scopes async init to captured userId, ignores stale responses
7. **Store checkout popup blocked** — changed `window.open` to `window.location.href` redirect
8. **Safari audio codec** — all MediaRecorder usage (`useSpatialAudio`, `useVAD`, `PTTOrb`, `AudioRecorder`) detects supported mime types instead of hardcoding `audio/webm;codecs=opus`; upload/transcription endpoints use actual blob type for extension/contentType
### Low (Fixed)
9. **Unused components removed** — `StudioItemCard`, `InspirationCarousel`, `InspirationGallery`, `GiftStore` deleted
10. **Audio metadata normalized** — `PTTOrb`, `useCircleAudio` use blob.type to determine file extension for uploads/transcription

## In-Chat Mature Mode Toggle
- When mature mode is enabled in Settings, a small flame icon toggle (`data-testid="toggle-mature-chat"`) appears in the chat input bar (between camera button and text input)
- Toggling it on/off controls `effectiveMatureMode` and `effectiveRoleplayMode` — which determine what `matureMode`/`roleplayMode` values are sent to the AI streaming request
- Settings toggle = intentional opt-in gate; in-chat toggle = convenient on/off during conversation
- When in-chat toggle is OFF, messages are sent with `matureMode: false` even though Settings still has it enabled
- A subtle orange glow + border appears on the input area when intimate mode is active
- If roleplay mode is also active, a sparkles badge appears on the flame button
- Toast feedback shows "Intimate mode on/off" on toggle
- The toggle auto-syncs: if Settings mature mode is disabled, the in-chat toggle disappears
