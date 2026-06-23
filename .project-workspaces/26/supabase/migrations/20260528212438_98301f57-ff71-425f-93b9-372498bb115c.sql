
CREATE OR REPLACE FUNCTION public.is_partner_member(_user_id uuid, _partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE user_id = _user_id AND partner_id = _partner_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_partner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id FROM public.profiles WHERE id = _user_id;
$$;

DROP POLICY IF EXISTS "Authenticated users can view active partners" ON public.partners;

CREATE POLICY "Authenticated users can view active partners"
ON public.partners
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    owner_user_id = auth.uid()
    OR id = public.get_user_partner_id(auth.uid())
    OR public.is_partner_member(auth.uid(), id)
    OR public.is_admin(auth.uid())
  )
);
