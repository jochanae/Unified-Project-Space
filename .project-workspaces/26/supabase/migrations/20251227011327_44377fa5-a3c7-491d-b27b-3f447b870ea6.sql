-- Fix the SECURITY DEFINER views issue by explicitly setting SECURITY INVOKER
-- This ensures the views use the permissions of the querying user, not the view creator

-- Recreate professionals_public view with SECURITY INVOKER
DROP VIEW IF EXISTS public.professionals_public;
CREATE VIEW public.professionals_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  title,
  specialty,
  bio,
  avatar_url,
  is_featured,
  is_verified,
  is_active,
  rating,
  review_count,
  specialties,
  states_licensed,
  partner_id,
  qr_code_url
FROM public.professionals
WHERE is_active = true;

-- Recreate partners_public view with SECURITY INVOKER
DROP VIEW IF EXISTS public.partners_public;
CREATE VIEW public.partners_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  hero_title,
  hero_description,
  tagline,
  is_active,
  office_name,
  external_website_url,
  design_theme,
  branding_level,
  show_name_with_logo
FROM public.partners
WHERE is_active = true;

-- Also fix the b2b_partner_referrals_user_safe view
DROP VIEW IF EXISTS public.b2b_partner_referrals_user_safe;
CREATE VIEW public.b2b_partner_referrals_user_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  referrer_user_id,
  referrer_professional_id,
  referrer_type,
  referred_business_name,
  business_type,
  status,
  created_at,
  updated_at
FROM b2b_partner_referrals
WHERE (referrer_user_id = auth.uid()) 
   OR (referrer_professional_id IN (
        SELECT professionals.id
        FROM professionals
        WHERE professionals.user_id = auth.uid()
      ));

-- Clean up the unused function
DROP FUNCTION IF EXISTS public.get_public_partner_info(partners);

-- Add comments
COMMENT ON VIEW public.b2b_partner_referrals_user_safe IS 'Safe view that only shows referrals belonging to the authenticated user. Uses SECURITY INVOKER.';
COMMENT ON VIEW public.professionals_public IS 'Public view of professionals with sensitive contact info excluded. Uses SECURITY INVOKER.';
COMMENT ON VIEW public.partners_public IS 'Public view of partners with sensitive business info excluded. Uses SECURITY INVOKER.';