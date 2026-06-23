-- Fix: Remove overly permissive INSERT policies on kid_transactions
-- These policies have "WITH CHECK condition: true" which allows anyone to insert

DROP POLICY IF EXISTS "Allow direct kid transaction insert" ON public.kid_transactions;
DROP POLICY IF EXISTS "Allow direct kid transaction inserts" ON public.kid_transactions;

-- Keep only the secure policy "Kids insert own transactions secure" which should properly check ownership