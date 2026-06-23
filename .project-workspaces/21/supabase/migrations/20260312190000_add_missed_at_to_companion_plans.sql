-- Add missed_at to companion_plans for end-of-day missed plan check-ins
-- When a scheduled plan wasn't completed by end of day, flag it.
-- Companion will check in naturally when user opens that chat.
ALTER TABLE public.companion_plans ADD COLUMN IF NOT EXISTS missed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_companion_plans_missed
  ON public.companion_plans (user_id, member_id) WHERE missed_at IS NOT NULL;
