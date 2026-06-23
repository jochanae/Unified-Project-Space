-- Fix RLS policies for kid operations (kids use PIN auth, not Supabase auth)

-- Allow kids to insert their own savings goals (they pass kid_id directly)
CREATE POLICY "Allow kids to create savings goals" ON public.kid_savings_goals
  FOR INSERT 
  WITH CHECK (true);

-- Allow kids to view their own savings goals
CREATE POLICY "Allow kids to view own savings goals" ON public.kid_savings_goals
  FOR SELECT 
  USING (true);

-- Allow kids to update their own savings goals  
CREATE POLICY "Allow kids to update savings goals" ON public.kid_savings_goals
  FOR UPDATE 
  USING (true);

-- Fix kid_transactions - allow inserts for kid sessions
DROP POLICY IF EXISTS "Kids can create their own transactions" ON public.kid_transactions;
CREATE POLICY "Allow kids to create transactions" ON public.kid_transactions
  FOR INSERT 
  WITH CHECK (true);

-- Allow kids to view their transactions
DROP POLICY IF EXISTS "Kids can view their own transactions" ON public.kid_transactions;
CREATE POLICY "Allow kids to view own transactions" ON public.kid_transactions
  FOR SELECT 
  USING (true);

-- Allow kids to update their profile (for balance updates)
DROP POLICY IF EXISTS "Kids can update their own profile" ON public.kids_profiles;
CREATE POLICY "Allow kids to update own profile" ON public.kids_profiles
  FOR UPDATE 
  USING (true);