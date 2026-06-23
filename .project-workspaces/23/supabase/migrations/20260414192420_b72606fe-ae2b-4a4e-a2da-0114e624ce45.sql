
-- 1. Fix shared_blueprints: require token match via request header
--    The app already filters by share_token, but the policy allowed reading ALL rows.
--    We'll create a secure function that the page can call instead.

DROP POLICY IF EXISTS "Anyone can view shared blueprints by token" ON public.shared_blueprints;

-- Anon can only select a blueprint if they provide the exact share_token
-- The app already does .eq('share_token', token), so this just enforces it at RLS level
-- We use a restrictive approach: require the query to filter by share_token
-- Since we can't enforce query params in RLS directly, we use a security definer function

CREATE OR REPLACE FUNCTION public.get_shared_blueprint(_token text)
RETURNS TABLE(project_name text, blueprint_data jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_name, blueprint_data
  FROM public.shared_blueprints
  WHERE share_token = _token
  LIMIT 1;
$$;

-- Grant anon access to the function
GRANT EXECUTE ON FUNCTION public.get_shared_blueprint(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_blueprint(text) TO authenticated;

-- 2. Fix role escalation: tighten update policy
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

CREATE POLICY "Users can update own record"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND org_id = get_user_org_id()
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  AND blocked_at IS NOT DISTINCT FROM (SELECT blocked_at FROM public.users WHERE id = auth.uid())
  AND blocked_reason IS NOT DISTINCT FROM (SELECT blocked_reason FROM public.users WHERE id = auth.uid())
);
