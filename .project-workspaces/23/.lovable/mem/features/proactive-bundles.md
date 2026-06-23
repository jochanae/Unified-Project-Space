---
name: Proactive Bundles
description: One-tap operational bundles on dashboard — AI captions + tracked links + auto-route to workspace
type: feature
---
MarQ Proactive Bundles surface on `/dashboard` above MarqSuggestionsCard via `ProactiveBundlesCard`.

Triggers:
- `zero_to_launch`: project created within last 48h (up to 2).
- `weekend_push`: instagram page_views dropped ≥30% over last 3d vs prior 3d, OR weekend window (Fri 5pm–Sun 11pm local) with zero page_views in last 24h.

Deploy action:
1. Calls edge fn `generate-bundle-caption` with `{ project_id, bundle_type }`.
2. Edge fn loads project + project_context and uses `google/gemini-3-flash-preview` via Lovable AI gateway to produce a tailored caption.
3. Client builds tracked URL `${origin}/p/<slug>?utm_source=instagram&utm_medium=social&utm_campaign={launch-sprint|weekend-push}`.
4. Copies caption + link to clipboard, fires toast, sets active project via `useFunnelHub.setActiveProject`, navigates to `/workspace`.

Dismissal: deployed bundle ids persisted in `localStorage[intoiq_deployed_bundles_<orgId>]`.
