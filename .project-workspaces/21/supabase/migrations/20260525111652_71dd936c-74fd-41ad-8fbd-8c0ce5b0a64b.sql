
-- 1. sanctuary_keys: drop broad unclaimed-key SELECT; clients use preview_sanctuary_key / claim_sanctuary_key RPCs (SECURITY DEFINER)
DROP POLICY IF EXISTS "Authenticated can lookup unclaimed keys for claim" ON public.sanctuary_keys;

-- 2. memory_relationships: require BOTH memories to belong to the requesting user
DROP POLICY IF EXISTS "Users can view relationships for their memories" ON public.memory_relationships;
CREATE POLICY "Users can view their own memory relationships"
ON public.memory_relationships
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.memories m WHERE m.id = memory_relationships.memory_id_a AND m.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.memories m WHERE m.id = memory_relationships.memory_id_b AND m.user_id = auth.uid())
);

-- 3. circle_guests: prevent circle owners from tampering with invite_token or user_id on UPDATE
CREATE OR REPLACE FUNCTION public.prevent_circle_guest_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service role bypasses
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Preserve sensitive fields on UPDATE
  NEW.invite_token := OLD.invite_token;
  NEW.user_id := OLD.user_id;
  NEW.email := OLD.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_circle_guest_tampering ON public.circle_guests;
CREATE TRIGGER prevent_circle_guest_tampering
BEFORE UPDATE ON public.circle_guests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_circle_guest_tampering();
