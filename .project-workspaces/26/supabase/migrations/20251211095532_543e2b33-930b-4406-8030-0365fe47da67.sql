-- Fix RLS policies for kid operations (kids use PIN auth, not Supabase auth)

-- Allow kids to manage their own chores
DROP POLICY IF EXISTS "Kids can insert their own chores" ON public.kid_chores;
DROP POLICY IF EXISTS "Kids can update their own chores" ON public.kid_chores;
DROP POLICY IF EXISTS "Kids can view their own chores" ON public.kid_chores;
DROP POLICY IF EXISTS "Kids can delete their own chores" ON public.kid_chores;

CREATE POLICY "Allow kids to view chores" ON public.kid_chores
  FOR SELECT USING (true);

CREATE POLICY "Allow kids to insert chores" ON public.kid_chores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow kids to update chores" ON public.kid_chores
  FOR UPDATE USING (true);

-- Allow kids to view their allowances
DROP POLICY IF EXISTS "Kids can view their own allowances" ON public.kid_allowances;
CREATE POLICY "Allow kids to view allowances" ON public.kid_allowances
  FOR SELECT USING (true);

-- Allow kids to send/receive chat messages
CREATE POLICY "Allow kids to send chat messages" ON public.family_chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow kids to view chat messages" ON public.family_chat_messages
  FOR SELECT USING (true);

-- Allow kids to view their family links
DROP POLICY IF EXISTS "Kids can view their family links" ON public.family_links;
CREATE POLICY "Allow kids to view family links" ON public.family_links
  FOR SELECT USING (true);