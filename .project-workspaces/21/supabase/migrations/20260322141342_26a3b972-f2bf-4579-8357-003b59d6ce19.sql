ALTER TABLE usage_tracking 
ADD COLUMN IF NOT EXISTS think_freely_messages integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_think_freely_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, usage_date, think_freely_messages, messages_sent, images_generated)
  VALUES (p_user_id, CURRENT_DATE, 1, 0, 0)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET think_freely_messages = usage_tracking.think_freely_messages + 1;
END;
$$;