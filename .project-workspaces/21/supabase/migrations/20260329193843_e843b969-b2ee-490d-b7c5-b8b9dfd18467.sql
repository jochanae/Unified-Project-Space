CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  INSERT INTO public.profiles (user_id, user_name, username)
  VALUES (
    NEW.id,
    v_name,
    v_username
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(profiles.username, EXCLUDED.username);
  RETURN NEW;
END;
$function$;