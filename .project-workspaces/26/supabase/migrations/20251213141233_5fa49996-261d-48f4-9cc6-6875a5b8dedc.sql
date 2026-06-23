-- =============================================
-- FIX CRITICAL SECURITY: Kids data exposed to public
-- =============================================

-- DROP all overly permissive policies on kids tables

-- kids_profiles
DROP POLICY IF EXISTS "Allow username lookup for login" ON public.kids_profiles;
DROP POLICY IF EXISTS "Allow kids to update own profile" ON public.kids_profiles;

-- kid_chores
DROP POLICY IF EXISTS "Allow kids to insert chores" ON public.kid_chores;
DROP POLICY IF EXISTS "Allow kids to update chores" ON public.kid_chores;
DROP POLICY IF EXISTS "Allow kids to view chores" ON public.kid_chores;

-- kid_allowances
DROP POLICY IF EXISTS "Allow kids to view allowances" ON public.kid_allowances;

-- kid_savings_goals
DROP POLICY IF EXISTS "Allow kids to create savings goals" ON public.kid_savings_goals;
DROP POLICY IF EXISTS "Allow kids to update savings goals" ON public.kid_savings_goals;
DROP POLICY IF EXISTS "Allow kids to view own savings goals" ON public.kid_savings_goals;

-- kid_transactions
DROP POLICY IF EXISTS "Allow kids to create transactions" ON public.kid_transactions;
DROP POLICY IF EXISTS "Allow kids to view own transactions" ON public.kid_transactions;

-- =============================================
-- CREATE SECURE POLICIES
-- =============================================

-- Helper function to check if current user owns a kid profile
CREATE OR REPLACE FUNCTION public.is_own_kid_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE id = profile_id AND user_id = auth.uid()
  )
$$;

-- Helper function to get kid_id for current authenticated user
CREATE OR REPLACE FUNCTION public.get_own_kid_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.kids_profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- =============================================
-- KIDS_PROFILES - Secure policies
-- =============================================

-- Kids can only view their own profile (proper check)
CREATE POLICY "Kids view own profile secure"
ON public.kids_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Kids can only update their own profile (proper check)
CREATE POLICY "Kids update own profile secure"
ON public.kids_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- =============================================
-- KID_CHORES - Secure policies
-- =============================================

-- Kids can view their own chores
CREATE POLICY "Kids view own chores secure"
ON public.kid_chores
FOR SELECT
USING (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
  OR 
  kid_id IN (
    SELECT kp.id FROM public.kids_profiles kp
    JOIN public.family_links fl ON fl.kid_profile_id = kp.id
    WHERE fl.parent_user_id = auth.uid() AND fl.status = 'active'
  )
);

-- Kids can insert chores for themselves
CREATE POLICY "Kids insert own chores secure"
ON public.kid_chores
FOR INSERT
WITH CHECK (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

-- Kids can update their own chores
CREATE POLICY "Kids update own chores secure"
ON public.kid_chores
FOR UPDATE
USING (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

-- =============================================
-- KID_ALLOWANCES - Secure policies
-- =============================================

-- Kids can view their own allowances
CREATE POLICY "Kids view own allowances secure"
ON public.kid_allowances
FOR SELECT
USING (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

-- =============================================
-- KID_SAVINGS_GOALS - Secure policies
-- =============================================

-- Kids can view their own savings goals
CREATE POLICY "Kids view own savings goals secure"
ON public.kid_savings_goals
FOR SELECT
USING (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

-- Kids can create savings goals for themselves
CREATE POLICY "Kids insert own savings goals secure"
ON public.kid_savings_goals
FOR INSERT
WITH CHECK (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

-- Kids can update their own savings goals
CREATE POLICY "Kids update own savings goals secure"
ON public.kid_savings_goals
FOR UPDATE
USING (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

-- =============================================
-- KID_TRANSACTIONS - Secure policies
-- =============================================

-- Kids can view their own transactions
CREATE POLICY "Kids view own transactions secure"
ON public.kid_transactions
FOR SELECT
USING (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

-- Kids can create transactions for themselves
CREATE POLICY "Kids insert own transactions secure"
ON public.kid_transactions
FOR INSERT
WITH CHECK (
  kid_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);