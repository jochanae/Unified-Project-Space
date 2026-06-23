
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

CREATE POLICY "Users can update own record"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND org_id = get_user_org_id());
