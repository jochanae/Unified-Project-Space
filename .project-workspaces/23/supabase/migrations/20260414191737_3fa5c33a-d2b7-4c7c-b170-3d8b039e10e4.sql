
-- Remove the dangerous INSERT policy — the handle_new_user() trigger
-- (SECURITY DEFINER) already creates the user record on signup.
-- No client-side INSERT on the users table should ever be needed.
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
