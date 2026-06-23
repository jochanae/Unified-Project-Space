-- Add RLS policy for parents to view linked kids profiles
-- Uses the is_parent_of_kid security definer function to avoid recursion

CREATE POLICY "Parents can view linked kids profiles via function"
ON public.kids_profiles
FOR SELECT
USING (
  public.is_parent_of_kid(id, auth.uid())
);

-- Also add policy for parents to view kids through family_group_members
-- This ensures family member listings work correctly
CREATE POLICY "Family group members can view kids in group"
ON public.kids_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_group_members fgm
    WHERE fgm.kid_profile_id = kids_profiles.id
    AND fgm.family_group_id IN (
      SELECT family_group_id FROM public.family_group_members
      WHERE user_id = auth.uid()
    )
  )
);