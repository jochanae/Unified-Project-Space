-- Harden budget_transactions: collaborator-aware access + validate budget_id on insert

DROP POLICY IF EXISTS "Users can view their own budget transactions" ON public.budget_transactions;
DROP POLICY IF EXISTS "Users can create their own budget transactions" ON public.budget_transactions;
DROP POLICY IF EXISTS "Users can delete their own budget transactions" ON public.budget_transactions;

-- SELECT: owner OR any collaborator on the linked budget
CREATE POLICY "Budget owners and collaborators can view budget transactions"
ON public.budget_transactions
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_budget_collaborator(budget_id, auth.uid())
);

-- INSERT: must own the row AND collaborate on the target budget
CREATE POLICY "Budget collaborators can create budget transactions"
ON public.budget_transactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_budget_collaborator(budget_id, auth.uid())
);

-- UPDATE: budget admins (owner/editor) only
CREATE POLICY "Budget admins can update budget transactions"
ON public.budget_transactions
FOR UPDATE
USING (public.is_budget_admin(budget_id, auth.uid()))
WITH CHECK (public.is_budget_admin(budget_id, auth.uid()));

-- DELETE: budget admins (owner/editor) only
CREATE POLICY "Budget admins can delete budget transactions"
ON public.budget_transactions
FOR DELETE
USING (public.is_budget_admin(budget_id, auth.uid()));