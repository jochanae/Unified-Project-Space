
-- The professionals_public view already excludes claim_token and stripe_connect_account_id.
-- Set it to SECURITY DEFINER so anon users can query it (it runs as the view owner who bypasses RLS).
ALTER VIEW public.professionals_public SET (security_invoker = off);
