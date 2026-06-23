
-- Add relationship_level to connections
ALTER TABLE public.connections ADD COLUMN relationship_level integer NOT NULL DEFAULT 1;

-- Create progression check function
CREATE OR REPLACE FUNCTION public.check_relationship_progression(p_user_id uuid, p_member_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_level integer;
  v_message_count integer;
  v_has_vulnerable boolean;
  v_new_level integer;
  v_first_message timestamptz;
  v_day_span integer;
BEGIN
  -- Get current level
  SELECT relationship_level INTO v_current_level
  FROM public.connections
  WHERE user_id = p_user_id AND member_id = p_member_id;

  IF v_current_level IS NULL THEN
    RETURN 1;
  END IF;

  -- Already max level
  IF v_current_level >= 4 THEN
    RETURN 4;
  END IF;

  -- Count total messages for this companion
  SELECT COUNT(*) INTO v_message_count
  FROM public.chat_messages
  WHERE user_id = p_user_id AND member_id = p_member_id;

  -- Calculate day span since first message
  SELECT MIN(created_at) INTO v_first_message
  FROM public.chat_messages
  WHERE user_id = p_user_id AND member_id = p_member_id;

  IF v_first_message IS NOT NULL THEN
    v_day_span := EXTRACT(DAY FROM (now() - v_first_message));
  ELSE
    v_day_span := 0;
  END IF;

  -- Check for vulnerable_share milestone
  SELECT EXISTS (
    SELECT 1 FROM public.companion_milestones
    WHERE user_id = p_user_id AND member_id = p_member_id AND milestone_type = 'vulnerable_share'
  ) INTO v_has_vulnerable;

  -- Determine new level based on thresholds
  v_new_level := 1;

  -- Level 2: 50+ messages OR 7+ day relationship
  IF v_message_count >= 50 OR v_day_span >= 7 THEN
    v_new_level := 2;
  END IF;

  -- Level 3: 200+ messages OR 30+ day relationship
  IF v_message_count >= 200 OR v_day_span >= 30 THEN
    v_new_level := 3;
  END IF;

  -- Level 4: 500+ messages AND vulnerable_share milestone
  IF v_message_count >= 500 AND v_has_vulnerable THEN
    v_new_level := 4;
  END IF;

  -- Only upgrade, never downgrade
  IF v_new_level > v_current_level THEN
    UPDATE public.connections
    SET relationship_level = v_new_level
    WHERE user_id = p_user_id AND member_id = p_member_id;
    RETURN v_new_level;
  END IF;

  RETURN v_current_level;
END;
$$;
