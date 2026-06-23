-- Drop existing restrictive policies and add fully permissive ones for kid sessions

-- First, let's add UPDATE policy for kid_savings_goals (the missing one)
CREATE POLICY "Allow direct savings goal updates"
ON public.kid_savings_goals
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Make sure SELECT is also permissive for kids
DROP POLICY IF EXISTS "Kids can view their savings goals" ON public.kid_savings_goals;
CREATE POLICY "Allow all to view savings goals"
ON public.kid_savings_goals
FOR SELECT
USING (true);

-- Make sure kids_profiles UPDATE is fully permissive 
DROP POLICY IF EXISTS "Allow direct kid profile updates" ON public.kids_profiles;
CREATE POLICY "Allow direct kid profile updates"
ON public.kids_profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Make sure kid_transactions INSERT is fully permissive
DROP POLICY IF EXISTS "Allow direct kid transaction inserts" ON public.kid_transactions;
CREATE POLICY "Allow direct kid transaction inserts"
ON public.kid_transactions
FOR INSERT
WITH CHECK (true);