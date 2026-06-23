-- Fix profiles table security: Block anonymous access and ensure proper restrictions

-- Drop existing overly permissive service role policy
DROP POLICY IF EXISTS "Service role can select profiles" ON public.profiles;

-- Add explicit deny for anonymous users (auth.uid() IS NULL)
CREATE POLICY "Block anonymous access to profiles" ON public.profiles
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Note: The existing policies already properly restrict:
-- - Authenticated users can view own profile (auth.uid() = id)
-- - Authenticated users can update own profile (auth.uid() = id)
-- - Admins can view all profiles (is_admin(auth.uid()))
-- The service role can still access via postgres role, not through RLS