CREATE OR REPLACE FUNCTION public.reset_test_account(p_test_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.beta_serial_numbers
    WHERE user_id = p_test_user_id
      AND serial_number = 0
  ) THEN
    RAISE EXCEPTION 'Not a test account';
  END IF;

  UPDATE public.profiles
  SET onboarding_completed = false,
      date_of_birth = NULL,
      companion_name = '',
      companion_avatar_url = NULL,
      companion_appearance_desc = NULL,
      companion_reference_image_url = NULL,
      connection_mode = 'unsure',
      onboarding_path = NULL,
      preferred_name = NULL,
      parental_consent_email = NULL,
      parental_consent_granted = false,
      kids_mode = false,
      home_anchor = 'dashboard',
      home_address = NULL,
      home_city = NULL,
      home_lat = NULL,
      home_lon = NULL,
      work_address = NULL,
      work_hub_city = NULL,
      work_lat = NULL,
      work_lon = NULL,
      updated_at = now()
  WHERE user_id = p_test_user_id;

  UPDATE public.beta_serial_numbers
  SET notified_at = NULL,
      snapshot_saved_at = NULL
  WHERE user_id = p_test_user_id;

  DELETE FROM public.connections WHERE user_id = p_test_user_id;
  DELETE FROM public.chat_messages WHERE user_id = p_test_user_id;
  DELETE FROM public.matchmaking_sessions WHERE user_id = p_test_user_id;
  DELETE FROM public.companion_milestones WHERE user_id = p_test_user_id;
  DELETE FROM public.companion_feed_posts WHERE user_id = p_test_user_id;
  DELETE FROM public.travel_log WHERE user_id = p_test_user_id;
  DELETE FROM public.memories WHERE user_id = p_test_user_id;
  DELETE FROM public.cami_memories WHERE user_id = p_test_user_id;
  DELETE FROM public.discovery_results WHERE user_id = p_test_user_id;
  DELETE FROM public.presence_moments WHERE user_id = p_test_user_id;
  DELETE FROM public.journal_entries WHERE user_id = p_test_user_id;
  DELETE FROM public.mood_checkins WHERE user_id = p_test_user_id;
  DELETE FROM public.notifications WHERE user_id = p_test_user_id;
  DELETE FROM public.favorites WHERE user_id = p_test_user_id;
  DELETE FROM public.companion_media WHERE user_id = p_test_user_id;
  DELETE FROM public.companion_plans WHERE user_id = p_test_user_id;
  DELETE FROM public.companion_facts WHERE user_id = p_test_user_id;
  DELETE FROM public.conversation_profiles WHERE user_id = p_test_user_id;

  RETURN true;
END;
$$;