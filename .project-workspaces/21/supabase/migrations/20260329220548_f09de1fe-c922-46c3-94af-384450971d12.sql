-- Prevent users from modifying admin-controlled fields on their own profile
CREATE OR REPLACE FUNCTION public.prevent_admin_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    NEW.is_blocked := OLD.is_blocked;
  END IF;
  IF NEW.blocked_at IS DISTINCT FROM OLD.blocked_at THEN
    NEW.blocked_at := OLD.blocked_at;
  END IF;
  IF NEW.blocked_reason IS DISTINCT FROM OLD.blocked_reason THEN
    NEW.blocked_reason := OLD.blocked_reason;
  END IF;
  IF NEW.parental_consent_granted IS DISTINCT FROM OLD.parental_consent_granted THEN
    NEW.parental_consent_granted := OLD.parental_consent_granted;
  END IF;
  IF NEW.kids_mode IS DISTINCT FROM OLD.kids_mode THEN
    NEW.kids_mode := OLD.kids_mode;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_admin_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_field_changes();