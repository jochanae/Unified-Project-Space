
ALTER TABLE public.usage_tracking ADD COLUMN IF NOT EXISTS ai_calls integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_ai_call_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, usage_date, ai_calls)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET ai_calls = usage_tracking.ai_calls + 1;
END;
$$;
