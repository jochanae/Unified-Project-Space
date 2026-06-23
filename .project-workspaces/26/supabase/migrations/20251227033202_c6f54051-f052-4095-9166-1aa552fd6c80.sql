-- Tighten accounts table RLS to authenticated users only (explicitly deny anon)

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Recreate policies scoped to the authenticated role
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Users can view their own accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
CREATE POLICY "Users can create their own accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Users can update their own accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Users can delete their own accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
