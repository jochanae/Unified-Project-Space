
-- Remove overly permissive policy
DROP POLICY "Users can create organizations" ON public.organizations;

-- The handle_new_user trigger runs as SECURITY DEFINER so it bypasses RLS.
-- No direct INSERT policy needed for organizations.
