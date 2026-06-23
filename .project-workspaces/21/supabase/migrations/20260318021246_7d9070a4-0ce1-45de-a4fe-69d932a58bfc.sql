
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, user_name, preferred_name, date_of_birth, parental_consent_email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'New User'
    ),
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
    NEW.raw_user_meta_data->>'parental_consent_email'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    date_of_birth = COALESCE(profiles.date_of_birth, EXCLUDED.date_of_birth),
    parental_consent_email = COALESCE(profiles.parental_consent_email, EXCLUDED.parental_consent_email),
    preferred_name = COALESCE(profiles.preferred_name, EXCLUDED.preferred_name);
  RETURN NEW;
END;
$function$;
