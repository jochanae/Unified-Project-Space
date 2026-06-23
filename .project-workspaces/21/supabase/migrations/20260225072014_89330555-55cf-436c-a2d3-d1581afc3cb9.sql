
-- Prevent minors from enabling mature_mode at the database level
CREATE OR REPLACE FUNCTION public.enforce_mature_mode_age_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If mature_mode is being set to true, verify user is 18+
  IF NEW.mature_mode = true AND (OLD.mature_mode IS DISTINCT FROM true) THEN
    IF NEW.date_of_birth IS NULL OR 
       AGE(CURRENT_DATE, NEW.date_of_birth) < INTERVAL '18 years' THEN
      NEW.mature_mode := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_mature_mode_age_gate
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_mature_mode_age_gate();
