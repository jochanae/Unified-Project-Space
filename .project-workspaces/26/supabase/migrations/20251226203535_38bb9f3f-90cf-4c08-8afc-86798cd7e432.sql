-- Add variable bill review settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS variable_review_day INTEGER DEFAULT 1 CHECK (variable_review_day >= 1 AND variable_review_day <= 28),
ADD COLUMN IF NOT EXISTS variable_review_enabled BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.variable_review_day IS 'Day of month (1-28) to send variable bill review reminder';
COMMENT ON COLUMN public.profiles.variable_review_enabled IS 'Whether to send monthly variable bill review reminders';