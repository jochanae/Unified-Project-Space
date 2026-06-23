
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voice_trial_seconds_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_voice_trial(p_user_id uuid, p_seconds integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE profiles 
  SET voice_trial_seconds_used = LEAST(voice_trial_seconds_used + p_seconds, 180)
  WHERE user_id = p_user_id;
$$;
