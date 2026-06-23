-- Remove the overly permissive search policy - this was a security mistake
DROP POLICY IF EXISTS "Allow username search for linking" ON public.kids_profiles;