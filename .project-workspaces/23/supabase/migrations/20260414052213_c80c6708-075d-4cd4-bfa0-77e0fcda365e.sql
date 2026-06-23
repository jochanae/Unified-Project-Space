-- Trigger to prevent non-admins from modifying sensitive user fields
CREATE OR REPLACE FUNCTION public.protect_user_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the caller is an admin, allow all changes
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Prevent non-admins from changing sensitive fields
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'You cannot modify your own role';
  END IF;

  IF NEW.blocked_at IS DISTINCT FROM OLD.blocked_at THEN
    RAISE EXCEPTION 'You cannot modify blocked status';
  END IF;

  IF NEW.blocked_reason IS DISTINCT FROM OLD.blocked_reason THEN
    RAISE EXCEPTION 'You cannot modify blocked reason';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_user_fields
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_sensitive_fields();

-- Tighten client_errors insert: anon must have null user_id, authenticated must match auth.uid()
DROP POLICY IF EXISTS "Anyone can insert errors" ON public.client_errors;

CREATE POLICY "Anon can insert errors without user_id"
  ON public.client_errors
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can insert own errors"
  ON public.client_errors
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
