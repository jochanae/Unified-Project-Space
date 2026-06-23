
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active professional profiles" ON public.professionals;
DROP POLICY IF EXISTS "Anyone can view active professionals" ON public.professionals;

-- Authenticated users can view active professionals (basic info access controlled at query level)
-- Full column access is safe for authenticated users who are owners/admins
CREATE POLICY "Owners and admins can view professionals" ON public.professionals
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR partner_id IN (SELECT id FROM public.partners WHERE owner_user_id = auth.uid())
);

-- Authenticated users can view active professionals for directory/search (non-sensitive columns selected at app level)
CREATE POLICY "Authenticated users can view active professionals" ON public.professionals
FOR SELECT
TO authenticated
USING (is_active = true);
