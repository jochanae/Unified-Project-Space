-- Drop the existing policy that's incomplete
DROP POLICY IF EXISTS "Parents can manage linked kids chores" ON public.kid_chores;

-- Create a complete policy with proper WITH CHECK for inserts
CREATE POLICY "Parents can manage linked kids chores"
ON public.kid_chores
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_chores.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_assign_chores = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_chores.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_assign_chores = true
  )
);