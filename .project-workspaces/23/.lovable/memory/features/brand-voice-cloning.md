---
name: Brand Voice Cloning
description: Innovation-tier ElevenLabs Instant Voice Cloning. Lives in Studio → Vault tab; cloned voices appear in Quinn Studio Video voice picker.
type: feature
---

**Tier:** Innovation only (`growth` tier in billing model, $79).

**Where it lives:** `src/features/brand-voice/` — `BrandVoicePanel` rendered inside Studio Vault tab, below `BrandVaultPanel`.

**Schema:** `brand_voices` table — `org_id`, `name`, `description`, `elevenlabs_voice_id`, `sample_storage_path`, `is_default`, `metadata`. Org-scoped RLS via `get_user_org_id()`.

**Edge function:** `clone-brand-voice` — accepts multipart form (name, description, sample audio file ≤10MB), tier-gates to `growth`/`innovation`, uploads sample to `project-assets/brand-voice-samples/{org_id}/`, sends to `https://api.elevenlabs.io/v1/voices/add` (Instant Voice Cloning), persists returned `voice_id`. Optional `set_default=true` clears other defaults first.

**Wiring into Quinn Studio Video:** `QuinnVideoStudio` calls `useBrandVoices()`; cloned voices render as gold-tinted "You" tiles in the voice picker grid alongside the 4 curated presets. The voice-preview edge function (`quinn-studio-voice-preview`) was updated: instead of a hardcoded `ALLOWED_VOICES` set, it now allows preset IDs OR cloned `brand_voices.elevenlabs_voice_id` rows belonging to the caller's org (verified server-side via service role).

**ElevenLabs constraint:** Voice cloning quota is per-account on ElevenLabs side — we don't currently surface usage. If `/v1/voices/add` returns 4xx (quota exceeded, free-tier limits), error is bubbled to the user via toast.
