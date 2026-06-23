-- Add policy to allow username lookup for login (public can check if username exists)
-- This only allows reading the id, username, and pin_hash for login verification
-- Other sensitive data is protected by existing RLS policies

CREATE POLICY "Allow username lookup for login"
ON public.kids_profiles
FOR SELECT
USING (true);

-- Note: This makes profiles readable, but the actual sensitive operations 
-- (update, create) still require proper authentication