-- Fix profiles RLS: ensure users can only see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Fix audit_logs INSERT policy: restrict to service role only
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Only service role can insert audit logs (no user-level INSERT policy)
-- Admins can still view via existing SELECT policy

-- Remove email column from profiles if it exists (already done in previous migration, ensure it's gone)
-- The column should have been dropped, but let's verify the policy update took effect

COMMENT ON TABLE public.audit_logs IS 'Audit log entries are created server-side only via edge functions using service role';