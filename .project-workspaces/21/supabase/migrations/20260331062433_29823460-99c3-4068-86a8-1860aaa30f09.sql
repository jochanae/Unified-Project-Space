CREATE OR REPLACE FUNCTION public.lock_date_of_birth()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow clearing DOB (used by reset_test_account)
  IF NEW.date_of_birth IS NULL AND OLD.date_of_birth IS NOT NULL THEN
    -- Only allow if called from a SECURITY DEFINER context (e.g. reset_test_account)
    -- Check: if onboarding_completed is also being set to false in the same UPDATE, allow it
    IF NEW.onboarding_completed = false AND OLD.onboarding_completed IS DISTINCT FROM false THEN
      RETURN NEW;
    END IF;
  END IF;

  -- If the OLD row already has a date_of_birth and the NEW value differs, block it
  IF OLD.date_of_birth IS NOT NULL 
     AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    NEW.date_of_birth := OLD.date_of_birth;
  END IF;
  RETURN NEW;
END;
$function$;