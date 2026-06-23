
-- Trigger function to enforce profile identity on user_posts
CREATE OR REPLACE FUNCTION public.enforce_post_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT user_name, username, companion_avatar_url
  INTO v_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_profile IS NOT NULL THEN
    NEW.user_name := v_profile.user_name;
    NEW.username := v_profile.username;
    -- avatar_url comes from auth provider, look it up from profiles or keep null
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function to enforce profile identity on post_comments
CREATE OR REPLACE FUNCTION public.enforce_comment_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Skip companion comments (inserted by service role with username=null and companion names)
  -- Companion comments have user_name set to the companion's name, not the user's
  -- We detect this by checking if the inserting role is service_role
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT user_name, username
  INTO v_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_profile IS NOT NULL THEN
    NEW.user_name := v_profile.user_name;
    NEW.username := v_profile.username;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function to enforce profile identity on circle_messages
CREATE OR REPLACE FUNCTION public.enforce_circle_message_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
BEGIN
  -- Only enforce for user-type messages, not companion messages
  IF NEW.sender_type = 'user' THEN
    SELECT user_name INTO v_name
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    IF v_name IS NOT NULL THEN
      NEW.sender_name := v_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function to enforce profile identity on circle_guestbook
CREATE OR REPLACE FUNCTION public.enforce_guestbook_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT user_name INTO v_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_name IS NOT NULL THEN
    NEW.display_name := v_name;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply triggers
CREATE TRIGGER enforce_post_identity_trigger
  BEFORE INSERT ON public.user_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_identity();

CREATE TRIGGER enforce_comment_identity_trigger
  BEFORE INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comment_identity();

CREATE TRIGGER enforce_circle_message_identity_trigger
  BEFORE INSERT ON public.circle_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_circle_message_identity();

CREATE TRIGGER enforce_guestbook_identity_trigger
  BEFORE INSERT ON public.circle_guestbook
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_guestbook_identity();
