-- Allow authenticated users to read basic public profile info for community features
-- The profiles_public view (with security_invoker=on) already filters sensitive fields
-- and respects show_real_name. This policy enables cross-user profile lookups.
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the now-redundant "Users can view their own profile" policy
-- since the new policy covers it
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;