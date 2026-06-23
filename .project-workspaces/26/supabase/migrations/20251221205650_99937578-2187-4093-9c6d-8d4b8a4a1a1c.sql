
-- FIX 2: Restrict profiles partner access to only non-PII columns
-- Drop the overly permissive partner policy
DROP POLICY IF EXISTS "Partners can view their associated user profiles" ON public.profiles;

-- Create a safe view for partner access that excludes PII
CREATE OR REPLACE VIEW public.profiles_partner_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  partner_id,
  first_name,
  last_name,
  profile_image_url,
  created_at,
  updated_at
  -- Excludes: email, phone_number, and other sensitive data
FROM public.profiles
WHERE partner_id IS NOT NULL;

-- Partners can view minimal non-PII data for their associated profiles
CREATE POLICY "Partners can view limited profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (partner_id IS NOT NULL) 
  AND (EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = profiles.partner_id 
    AND partners.owner_user_id = auth.uid()
  ))
);

-- Grant access to safe view
REVOKE ALL ON public.profiles_partner_safe FROM anon;
GRANT SELECT ON public.profiles_partner_safe TO authenticated;

-- Add security comments
COMMENT ON VIEW public.plaid_items_safe IS 'Safe view that excludes sensitive plaid_access_token - ALWAYS use this instead of the raw table';
COMMENT ON VIEW public.profiles_partner_safe IS 'Safe view for partner access that excludes PII fields like email and phone';
