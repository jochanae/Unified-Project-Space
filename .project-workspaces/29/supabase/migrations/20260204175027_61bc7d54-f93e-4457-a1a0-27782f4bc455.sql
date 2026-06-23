-- Fix 1: Update profiles SELECT policies to be more restrictive
-- Users should only see their own profile, admins can see all

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a proper policy that only allows viewing own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- The admin policy is already correct (uses is_admin function)

-- Fix 2: Update feedback table to remove the user_id IS NULL condition
-- This prevents anonymous feedback from being publicly readable

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;

-- Create a proper policy - users see their own, admins see all
CREATE POLICY "Users can view their own feedback"
ON public.feedback
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  is_admin(auth.uid())
);

-- Note: Anonymous feedback (user_id IS NULL) will only be visible to admins now