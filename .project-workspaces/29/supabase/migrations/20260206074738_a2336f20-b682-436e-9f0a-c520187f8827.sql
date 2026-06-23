
-- Fix the overly permissive feedback INSERT policy
-- Drop the existing policy that allows anyone to create feedback
DROP POLICY IF EXISTS "Anyone can create feedback" ON public.feedback;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can create feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));
