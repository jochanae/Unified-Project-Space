
CREATE OR REPLACE FUNCTION public.generate_username(p_name text, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_handle text;
  candidate text;
  suffix int := 0;
BEGIN
  base_handle := lower(regexp_replace(COALESCE(p_name, ''), '[^a-zA-Z0-9]', '', 'g'));
  IF base_handle = '' OR length(base_handle) < 2 THEN
    base_handle := 'user';
  END IF;
  base_handle := left(base_handle, 15);
  candidate := base_handle;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE username = candidate AND user_id != p_user_id) THEN
      RETURN candidate;
    END IF;
    suffix := suffix + 1;
    candidate := base_handle || floor(random() * 900 + 100)::int::text;
    IF suffix > 20 THEN
      candidate := base_handle || substr(p_user_id::text, 1, 6);
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
  v_username text;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'New User'
  );
  v_username := public.generate_username(v_name, NEW.id);
  INSERT INTO public.profiles (user_id, user_name, preferred_name, date_of_birth, parental_consent_email, username)
  VALUES (
    NEW.id,
    v_name,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NULL
    ),
    CASE 
      WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'date_of_birth')::date
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'parental_consent_email',
    v_username
  )
  ON CONFLICT (user_id) DO UPDATE SET
    date_of_birth = COALESCE(profiles.date_of_birth, EXCLUDED.date_of_birth),
    parental_consent_email = COALESCE(profiles.parental_consent_email, EXCLUDED.parental_consent_email),
    preferred_name = COALESCE(profiles.preferred_name, EXCLUDED.preferred_name),
    username = COALESCE(profiles.username, EXCLUDED.username);
  RETURN NEW;
END;
$$
