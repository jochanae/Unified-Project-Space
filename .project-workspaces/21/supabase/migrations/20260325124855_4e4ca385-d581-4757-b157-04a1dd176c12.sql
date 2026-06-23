
ALTER TABLE public.usage_tracking
ADD COLUMN voice_minutes_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_voice_minutes(p_user_id uuid, p_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, usage_date, voice_minutes_used)
  VALUES (p_user_id, CURRENT_DATE, p_minutes)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET voice_minutes_used = usage_tracking.voice_minutes_used + p_minutes;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_voice_minutes(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COALESCE(SUM(voice_minutes_used), 0) INTO v_total
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND usage_date >= date_trunc('month', CURRENT_DATE)::date;
  RETURN v_total;
END;
$$;
