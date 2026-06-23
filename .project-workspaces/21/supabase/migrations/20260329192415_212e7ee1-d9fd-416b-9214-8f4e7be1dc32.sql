CREATE OR REPLACE FUNCTION public.claim_beta_serial(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_serial integer;
BEGIN
  -- Check if already claimed
  SELECT serial_number INTO v_serial FROM beta_serial_numbers WHERE user_id = p_user_id;
  IF v_serial IS NOT NULL THEN
    RETURN v_serial;
  END IF;
  
  -- Get next serial (max 100), exclude serial 0 (test account)
  SELECT COALESCE(MAX(serial_number), 0) + 1 INTO v_serial FROM beta_serial_numbers WHERE serial_number > 0;
  IF v_serial > 100 THEN
    RETURN -1; -- sold out
  END IF;
  
  INSERT INTO beta_serial_numbers (user_id, serial_number)
  VALUES (p_user_id, v_serial);
  
  RETURN v_serial;
END;
$function$;

-- Admin-only function to reset the test account for re-testing onboarding
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

  -- Reset profile onboarding
  UPDATE profiles SET
    onboarding_completed = false,
    companion_name = '',
    companion_avatar_url = NULL,
    companion_appearance_desc = NULL,
    companion_reference_image_url = NULL,
    connection_mode = 'unsure',
    onboarding_path = NULL,
    preferred_name = NULL
  WHERE user_id = p_test_user_id;

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

  RETURN true;
END;
$function$;