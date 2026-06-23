# Phase 2b — Studio Engine cutover

Four work blocks. Each can ship independently; recommended order below.

---

## Block 1 — Extend `studio-generate` backend

Add capabilities the old logo functions had:

1. **`referenceImage`** (string data-URL or https URL) — when present, sends a multimodal edit request and uses the edit-mode guardrails ("change only what's described, keep the rest").
2. **`mode: 'logo'` enhancements** — port the style aesthetic map (`modern and minimal`, `bold and geometric`, etc.) + the icon sub-mode (`subMode: 'icon'` → pure white background, isolated graphic).
3. **`strict: boolean`** — when true, bypass brand injection / descriptor and send the raw prompt only. Needed by the logo canvas editor.

No streaming/canvas-commands mode yet (see Block 2 decision).

---

## Block 2 — Logo Generator migration *(decision needed)*

`quinn-logo` is a streaming chat that returns canvas commands (`add_text`, `set_background`, `update_element`, etc.) — fundamentally different from one-shot image generation. Two options:

**Option A (recommended):** Keep `quinn-logo` as-is — it's a specialized canvas-orchestration agent, not an image generator. Only delete `generate-logo` (after `AILogoGenerator` + the `quinn-logo` internal image-edit call are swapped to `studio-generate` with `mode:'logo'` + `referenceImage`).

**Option B:** Build a second unified streaming entrypoint (`studio-chat`) that returns canvas commands. Significantly larger effort, no real consolidation win since the logo canvas is the only consumer.

Going with **A** unless you say otherwise.

---

## Block 3 — Quinn chat inline image generation *(new feature)*

Right now Quinn chat (`QuinnChat.tsx`) has no image path — "sketch me a heart" returns text/emoji. Add:

1. **Intent detection** in the chat edge function: if the user message looks like an image request ("sketch", "draw", "generate an image of", "create a visual", "design a flyer for…"), the assistant returns a structured tool-call-style payload `{ type: 'image', mode, prompt, platform? }` instead of prose.
2. **Client-side handler** in `QuinnChat`: when an assistant message contains an image payload, call `useStudioGenerate`, then render the result inline (max-width ~512px) with `OutputActions` (Download / Copy URL / Share / Open in Studio) directly underneath.
3. **Persistence**: store the resulting `imageUrl` on the message row so it survives reload.

Requires inspecting the current Quinn chat schema (messages table, edge function) before wiring — I'll do that first and report back if the structure makes intent-detection messy.

---

## Block 4 — Dialog consolidation onto `StudioEngineDialog`

Currently the engine UI is a stub. Two-step:

1. **Build the real `StudioEngine` canvas** — mode tabs (Logo / Flyer / Social / Hero / Free), prompt textarea, platform selector (when `mode='social'`), template picker (merged registry), preview area, `OutputActions` footer.
2. **Merge `TemplateGallery` + `BrandTemplates`** into a single filterable grid filtered by `mode` and `theme`.
3. **Swap launchers** — replace bespoke dialogs with `<StudioEngineDialog mode="…" />`:
   - `CampaignBundleDialog` → launches 3 sequential `mode:'flyer'` runs (keep the bundle wrapper, replace the inner generator).
   - `QuickFlyerDialog` → `mode:'flyer'`.
   - `AssetGeneratorDialog` → `mode:'flyer'` (or mode picker).
   - `SocialExportPanel` AI button → `mode:'social'` + platform.

Old dialogs deleted after parity is verified manually in the preview.

---

## Recommended execution order

1. Block 1 (backend extension) — low risk, unblocks everything else.
2. Block 4.1 (build real `StudioEngine` canvas) — needed before swapping dialogs.
3. Block 4.2/4.3 (merge gallery + swap dialogs) — verify each surface in preview before deleting old code.
4. Block 2 (delete `generate-logo`, swap `AILogoGenerator` + internal `quinn-logo` edit call).
5. Block 3 (Quinn chat inline images) — biggest UX win, but it's a net-new feature; ship last so it doesn't block consolidation.

---

## Questions before I start

1. **Logo streaming**: confirm Option A (keep `quinn-logo`, only retire `generate-logo`).
2. **Quinn chat intent detection**: tolerate a simple keyword/heuristic trigger first, or want the model itself to decide via structured output? Heuristic ships in a day; structured-output requires editing the Quinn system prompt + response schema.
3. **Dialog deletion**: delete `QuickFlyerDialog` / `CampaignBundleDialog` files outright once swapped, or leave them as thin wrappers that just open `StudioEngineDialog` with preset config (keeps existing call sites working without edits)?
4. **Scope check**: ship all four blocks in one pass, or split — e.g. Blocks 1+4 now, Blocks 2+3 as Phase 2c?
