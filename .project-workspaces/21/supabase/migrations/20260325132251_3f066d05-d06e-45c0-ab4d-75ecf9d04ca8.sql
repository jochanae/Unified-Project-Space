
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS voice_minutes_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_minutes_reset_at timestamptz;

CREATE OR REPLACE FUNCTION public.reset_voice_minutes(p_user_id uuid, p_next_reset timestamptz)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles
  SET voice_minutes_used = 0,
      voice_minutes_reset_at = p_next_reset
  WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_premium_voice(p_user_id uuid, p_seconds integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles
  SET voice_minutes_used = LEAST(voice_minutes_used + p_seconds, 3600)
  WHERE user_id = p_user_id;
$$;
