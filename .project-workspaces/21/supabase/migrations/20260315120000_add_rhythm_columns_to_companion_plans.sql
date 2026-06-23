-- Add Life Rhythms columns to companion_plans
ALTER TABLE public.companion_plans 
ADD COLUMN IF NOT EXISTS is_rhythm boolean NOT NULL DEFAULT false;

ALTER TABLE public.companion_plans 
ADD COLUMN IF NOT EXISTS rhythm_completed_today boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS rhythm_last_completed date DEFAULT null;
