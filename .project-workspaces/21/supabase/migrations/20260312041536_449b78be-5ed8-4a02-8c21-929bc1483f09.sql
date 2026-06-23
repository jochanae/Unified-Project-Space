
-- Phase 1a: Add source_type and checkin_id to journal_entries
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS checkin_id UUID REFERENCES public.mood_checkins(id) ON DELETE SET NULL;

-- Phase 1b: Add companion_context to mood_checkins
ALTER TABLE public.mood_checkins
  ADD COLUMN IF NOT EXISTS companion_context JSONB NOT NULL DEFAULT '{}';
