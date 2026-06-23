
-- Drop the existing broad SELECT policy on virtual_gifts
DROP POLICY IF EXISTS "Authenticated users can view active gifts" ON public.virtual_gifts;

-- Replace with admin-only direct access
CREATE POLICY "Only admins can read virtual_gifts directly"
ON public.virtual_gifts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Recreate the public view WITHOUT security_invoker so it bypasses base table RLS
DROP VIEW IF EXISTS public.virtual_gifts_public;
CREATE VIEW public.virtual_gifts_public
WITH (security_invoker=false) AS
  SELECT id, name, description, category, image_url, price_cents, prompt_modifier, is_active, created_at, mature_only
  FROM virtual_gifts
  WHERE is_active = true;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.virtual_gifts_public TO authenticated;
