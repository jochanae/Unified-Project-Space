-- Add preferred AI provider to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_ai_provider text NOT NULL DEFAULT 'smart';

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_preferred_ai_provider_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_preferred_ai_provider_check
CHECK (preferred_ai_provider IN ('smart', 'chatgpt', 'perplexity'));