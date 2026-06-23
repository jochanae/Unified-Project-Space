
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;

-- Mark all existing users as onboarded so they skip the welcome overlay
UPDATE public.users SET has_completed_onboarding = true;
