-- Prevent circle members from escalating their own role
-- Only circle owners (checked via is_circle_owner) can change roles
CREATE OR REPLACE FUNCTION public.prevent_circle_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If role is not being changed, allow the update
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Allow if the current user is the circle owner
  IF is_circle_owner(OLD.circle_id, auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Revert the role change for non-owners
  NEW.role := OLD.role;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_circle_role_escalation
BEFORE UPDATE ON public.circle_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_circle_role_escalation();