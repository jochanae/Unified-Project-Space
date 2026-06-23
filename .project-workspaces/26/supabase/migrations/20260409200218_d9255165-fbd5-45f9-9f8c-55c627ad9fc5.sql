
-- Fix the overly permissive SELECT policy on partners
DROP POLICY "Public can view basic partner info" ON public.partners;

-- Authenticated users can view active partners they're associated with or own
CREATE POLICY "Authenticated users can view active partners" ON public.partners
FOR SELECT
TO authenticated
USING (
  is_active = true AND (
    owner_user_id = auth.uid()
    OR id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid())
    OR id IN (SELECT partner_id FROM public.partner_members WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  )
);

-- Anon users should use the partners_public view instead
-- No direct SELECT policy for anon on the partners table
