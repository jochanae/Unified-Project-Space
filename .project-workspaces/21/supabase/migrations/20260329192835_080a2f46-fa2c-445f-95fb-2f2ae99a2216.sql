CREATE OR REPLACE FUNCTION public.reset_test_account(p_test_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can call this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only allow resetting serial #0 (the test account)
  IF NOT EXISTS (SELECT 1 FROM beta_serial_numbers WHERE user_id = p_test_user_id AND serial_number = 0) THEN
    RAISE EXCEPTION 'Not a test account';
  END IF;

  -- Temporarily disable the DOB lock trigger so we can clear it
  ALTER TABLE profiles DISABLE TRIGGER lock_dob_once_set;

  -- Reset profile onboarding (including DOB so WelcomeSetup triggers)
  UPDATE profiles SET
    onboarding_completed = false,
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
    kids_mode = false
  WHERE user_id = p_test_user_id;

  -- Re-enable the DOB lock trigger
  ALTER TABLE profiles ENABLE TRIGGER lock_dob_once_set;

  -- Reset founding reveal/snapshot flags
  UPDATE beta_serial_numbers SET
    notified_at = NULL,
    snapshot_saved_at = NULL
  WHERE user_id = p_test_user_id;

  -- Delete all connections for test account
  DELETE FROM connections WHERE user_id = p_test_user_id;

  -- Delete chat messages
  DELETE FROM chat_messages WHERE user_id = p_test_user_id;

  -- Delete matchmaking sessions
  DELETE FROM matchmaking_sessions WHERE user_id = p_test_user_id;

  -- Delete companion milestones
  DELETE FROM companion_milestones WHERE user_id = p_test_user_id;

  -- Delete companion feed posts
  DELETE FROM companion_feed_posts WHERE user_id = p_test_user_id;

  RETURN true;
END;
$function$;