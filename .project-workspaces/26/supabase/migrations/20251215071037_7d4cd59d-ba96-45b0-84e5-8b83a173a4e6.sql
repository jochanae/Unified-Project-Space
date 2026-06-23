-- Add RLS policy for parents to view linked kids' profiles
CREATE POLICY "Parents can view linked kids profiles"
ON public.kids_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kids_profiles.id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
);

-- Add RLS policy for parents to view linked kids' savings goals (already exists but adding for INSERT so they can help add)
CREATE POLICY "Parents can manage linked kids savings goals"
ON public.kid_savings_goals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    JOIN public.kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE kids_profiles.id = kid_savings_goals.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    JOIN public.kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE kids_profiles.id = kid_savings_goals.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
);

-- Add policy for parents to INSERT transactions for their linked kids (like deposits)
CREATE POLICY "Parents can add transactions for linked kids"
ON public.kid_transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    JOIN public.kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE kids_profiles.id = kid_transactions.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
);