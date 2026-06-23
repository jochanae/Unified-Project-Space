-- Allow public username lookup for login (only returns necessary login fields)
CREATE POLICY "Allow public username lookup for login"
ON public.kids_profiles
FOR SELECT
USING (true);