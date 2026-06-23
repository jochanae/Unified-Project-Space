
-- =====================================================
-- SECURITY FIX 1: b2b_partner_referrals - Create safe view without sensitive fields
-- =====================================================

-- Create a safe view that excludes sensitive business data for non-admins
CREATE OR REPLACE VIEW public.b2b_partner_referrals_user_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  referrer_user_id,
  referrer_professional_id,
  referrer_type,
  referred_business_name,
  -- Exclude: referred_contact_email, referred_contact_name, referred_contact_phone
  business_type,
  status,
  -- Exclude: commission_amount, commission_percent, deal_value, monthly_revenue
  -- Exclude: admin_notes, payout details
  created_at,
  updated_at
FROM public.b2b_partner_referrals
WHERE referrer_user_id = auth.uid() 
   OR referrer_professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid());

GRANT SELECT ON public.b2b_partner_referrals_user_safe TO authenticated;
REVOKE ALL ON public.b2b_partner_referrals_user_safe FROM anon;

-- =====================================================
-- SECURITY FIX 2: profiles - Create partner-safe view without PII
-- =====================================================

-- Drop if exists and recreate
DROP VIEW IF EXISTS public.profiles_partner_safe;

CREATE VIEW public.profiles_partner_safe
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
  -- Excludes: email, phone_number (PII)
FROM public.profiles
WHERE partner_id IS NOT NULL;

GRANT SELECT ON public.profiles_partner_safe TO authenticated;
REVOKE ALL ON public.profiles_partner_safe FROM anon;

-- Update partner policy to be more restrictive - only allow owners to see their partner's users
DROP POLICY IF EXISTS "Partners can view limited profile info" ON public.profiles;

CREATE POLICY "Partners can view their users via safe view only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Partners should use profiles_partner_safe view instead
  -- This policy blocks direct table access for partner queries
  (partner_id IS NULL) OR (id = auth.uid())
);

-- =====================================================
-- SECURITY FIX 3: kids_profiles - Block pin_hash/security_answer access
-- =====================================================

-- Update policies to ensure parents/family members MUST use the safe view
-- Drop existing policies that expose full table
DROP POLICY IF EXISTS "Parents can view linked kids profiles via function" ON public.kids_profiles;
DROP POLICY IF EXISTS "Family group members can view kids in group" ON public.kids_profiles;

-- Parents must use get_linked_kids_profiles() function which excludes sensitive fields
CREATE POLICY "Parents view kids via function only"
ON public.kids_profiles
FOR SELECT
TO authenticated
USING (
  -- Only allow if kid's own user_id matches OR parent uses the security definer function
  user_id = auth.uid()
);

-- Family group members should also use the safe view
-- Create a function to get kids in family group safely
CREATE OR REPLACE FUNCTION public.get_family_group_kids_safe(p_group_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  display_name text,
  username text,
  age_tier kid_age_tier,
  avatar_emoji text,
  avatar_url text,
  chart_color text,
  current_balance numeric,
  spend_balance numeric,
  save_balance numeric,
  give_balance numeric
  -- Excludes: pin_hash, security_answer, security_question
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    kp.id,
    kp.first_name,
    kp.last_name,
    kp.display_name,
    kp.username,
    kp.age_tier,
    kp.avatar_emoji,
    kp.avatar_url,
    kp.chart_color,
    kp.current_balance,
    kp.spend_balance,
    kp.save_balance,
    kp.give_balance
  FROM kids_profiles kp
  INNER JOIN family_group_members fgm ON fgm.kid_profile_id = kp.id
  WHERE fgm.family_group_id = p_group_id
    AND is_family_group_member(p_group_id, auth.uid());
$$;

-- =====================================================
-- SECURITY FIX 4: plaid_items - Restrict INSERT/UPDATE/DELETE
-- =====================================================

-- Update INSERT policy to be more restrictive
DROP POLICY IF EXISTS "Users can create their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can update their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can delete their own plaid items" ON public.plaid_items;

-- Only allow INSERT via service role (edge functions)
-- Users should use the Plaid link flow which goes through edge functions
CREATE POLICY "Service role only for plaid item creation"
ON public.plaid_items
FOR INSERT
TO authenticated
WITH CHECK (false); -- Block direct inserts, must go through edge function

-- Only allow UPDATE via service role
CREATE POLICY "Service role only for plaid item updates"
ON public.plaid_items
FOR UPDATE
TO authenticated
USING (false); -- Block direct updates

-- Allow DELETE only for own items (to disconnect bank)
CREATE POLICY "Users can disconnect their own plaid items"
ON public.plaid_items
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
