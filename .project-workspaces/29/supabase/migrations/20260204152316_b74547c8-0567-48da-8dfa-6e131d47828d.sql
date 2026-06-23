-- Fix 1: Restrict feedback table SELECT access - only allow users to see their OWN feedback, and admins to see all
-- First drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view feedback" ON public.feedback;

-- Create more restrictive SELECT policy - users see only their own, admins see all
CREATE POLICY "Users can view own feedback" 
ON public.feedback 
FOR SELECT 
USING (
    auth.uid() = user_id 
    OR is_admin(auth.uid())
);

-- Fix 2: Add policy for users to view their own payment info
CREATE POLICY "Users can view own payment info" 
ON public.user_payment_info 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fix 3: Passkeys - the current RLS is already restrictive (users can only see their own)
-- But we'll add an explicit comment and ensure the policy is correct
-- No change needed for passkeys as the current policy is appropriate for WebAuthn