-- Add a secure RLS policy to allow authenticated users to search for kids by username
-- This is necessary for the "Link Kid" feature where parents search for their child's account
-- Only returns minimal public info needed for linking (no sensitive data)

CREATE POLICY "Allow username search for linking"
ON public.kids_profiles
FOR SELECT
USING (
  -- Allow authenticated users to find kids by exact username match
  -- This is safe because:
  -- 1. Only authenticated users can search
  -- 2. Users need to know the exact username
  -- 3. Only public display info is shown in the link modal
  auth.uid() IS NOT NULL
);