CREATE OR REPLACE FUNCTION public.lock_date_of_birth()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow clearing DOB to NULL (only reset_test_account does this)
  IF NEW.date_of_birth IS NULL THEN
    RETURN NEW;
  END IF;

  -- If the OLD row already has a date_of_birth and the NEW value differs, block it
  IF OLD.date_of_birth IS NOT NULL 
     AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    NEW.date_of_birth := OLD.date_of_birth;
  END IF;
  RETURN NEW;
END;
$function$;