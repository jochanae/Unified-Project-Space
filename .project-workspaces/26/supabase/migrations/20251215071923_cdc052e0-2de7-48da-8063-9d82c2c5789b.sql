-- Drop policies that cause recursion through kids_profiles
DROP POLICY IF EXISTS "Parents can view linked kids transactions" ON public.kid_transactions;
DROP POLICY IF EXISTS "Parents can add transactions for linked kids" ON public.kid_transactions;
DROP POLICY IF EXISTS "Parents can manage linked kids chores" ON public.kid_chores;
DROP POLICY IF EXISTS "Parents can manage linked kids savings goals" ON public.kid_savings_goals;
DROP POLICY IF EXISTS "Parents can manage linked kids allowances" ON public.kid_allowances;

-- Recreate policies using direct family_links check (no kids_profiles join)
CREATE POLICY "Parents can view linked kids transactions"
ON public.kid_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_transactions.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_view_transactions = true
  )
);

CREATE POLICY "Parents can add transactions for linked kids"
ON public.kid_transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_transactions.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
);

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

CREATE POLICY "Parents can manage linked kids savings goals"
ON public.kid_savings_goals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_savings_goals.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_savings_goals.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
  )
);

CREATE POLICY "Parents can manage linked kids allowances"
ON public.kid_allowances
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_allowances.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_set_allowance = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.kid_profile_id = kid_allowances.kid_id
    AND family_links.parent_user_id = auth.uid()
    AND family_links.status = 'active'
    AND family_links.can_set_allowance = true
  )
);