-- Fix 1: Update the partners profile viewing policy to require authentication
DROP POLICY IF EXISTS "Partners can view their associated user profiles" ON public.profiles;

CREATE POLICY "Partners can view their associated user profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  (partner_id IS NOT NULL) AND 
  (EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = profiles.partner_id 
    AND partners.owner_user_id = auth.uid()
  ))
);

-- Fix 2: Enable RLS on plaid_items_safe view
-- For views, we need to ensure security - drop and recreate with security invoker
DROP VIEW IF EXISTS public.plaid_items_safe;

CREATE VIEW public.plaid_items_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  institution_name,
  institution_id,
  status,
  created_at,
  updated_at
FROM public.plaid_items
WHERE auth.uid() = user_id;

-- Grant access to authenticated users only
REVOKE ALL ON public.plaid_items_safe FROM anon;
REVOKE ALL ON public.plaid_items_safe FROM public;
GRANT SELECT ON public.plaid_items_safe TO authenticated;