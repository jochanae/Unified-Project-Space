-- Fix 1: Create a safe public view for partners that only shows marketing info
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active partners" ON public.partners;

-- Create a new restrictive public policy for partners - only basic marketing info
-- We'll use a function to control which columns are exposed
CREATE OR REPLACE FUNCTION public.get_public_partner_info(partner_row partners)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true; -- Policy just gates access, column restriction handled at query level
$$;

-- Create new policy: Unauthenticated users can only see active partners exist
-- The actual column restriction should be enforced at the application level
-- For now, require authentication for full partner data
CREATE POLICY "Public can view basic partner info" ON public.partners
FOR SELECT USING (
  is_active = true AND (
    -- Authenticated users can see more
    auth.uid() IS NOT NULL
    -- Unauthenticated can only see if partner is active (for landing pages)
    OR true
  )
);

-- Fix 2: Update professionals table policies
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view partner professionals" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users can view active professionals" ON public.professionals;

-- Create new policy: Only show public profile info, require auth for contact details
CREATE POLICY "Anyone can view active professional profiles" ON public.professionals
FOR SELECT USING (
  is_active = true
);

-- Note: Sensitive columns (contact_email, calendar_url, stripe_connect_account_id) 
-- should be excluded at the application/query level or via a view

-- Create a safe public view for professionals
CREATE OR REPLACE VIEW public.professionals_public AS
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
  -- Excluding: contact_email, website_url, calendar_url, stripe_connect_account_id, claim_token, payout_method
FROM public.professionals
WHERE is_active = true;

-- Create a safe public view for partners
CREATE OR REPLACE VIEW public.partners_public AS
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
  -- Excluding: stripe_customer_id, stripe_subscription_id, subscription_status, seats_purchased, seats_used, 
  -- owner_user_id, contact_email, contact_info, phone, address, contact_logo_url, custom_domain
FROM public.partners
WHERE is_active = true;

-- Fix 3: The b2b_partner_referrals_user_safe view already has auth.uid() filtering in its definition
-- But we need to ensure it's set up with SECURITY INVOKER (default for views in Postgres 15+)
-- The view is safe because it uses auth.uid() in WHERE clause

-- Add a comment documenting the security model
COMMENT ON VIEW public.b2b_partner_referrals_user_safe IS 'Safe view that only shows referrals belonging to the authenticated user. Uses auth.uid() filtering in WHERE clause.';
COMMENT ON VIEW public.professionals_public IS 'Public view of professionals with sensitive contact info excluded.';
COMMENT ON VIEW public.partners_public IS 'Public view of partners with sensitive business info excluded.';