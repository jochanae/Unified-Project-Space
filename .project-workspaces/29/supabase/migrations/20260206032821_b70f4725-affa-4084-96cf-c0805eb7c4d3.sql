-- Fix RLS policy for user_quinn_context to properly support upsert
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own context" ON public.user_quinn_context;
DROP POLICY IF EXISTS "Users can update their own context" ON public.user_quinn_context;

-- Recreate with proper WITH CHECK clauses for upsert support
CREATE POLICY "Users can insert their own context" 
ON public.user_quinn_context 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context" 
ON public.user_quinn_context 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);