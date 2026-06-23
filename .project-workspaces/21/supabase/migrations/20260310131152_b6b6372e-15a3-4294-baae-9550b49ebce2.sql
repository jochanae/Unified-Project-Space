
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vibe_preferences text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS presence_preference text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visual_style text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preferred_companion_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_path text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
