ALTER TABLE public.usage_tracking ADD COLUMN IF NOT EXISTS sanctuary_minutes integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_sanctuary_minutes(p_user_id uuid, p_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, usage_date, sanctuary_minutes)
  VALUES (p_user_id, CURRENT_DATE, p_minutes)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET sanctuary_minutes = usage_tracking.sanctuary_minutes + p_minutes;
END;
$$;