
-- =====================================================
-- FIX: kids_profiles parent access - was too restrictive
-- =====================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Parents view kids via function only" ON public.kids_profiles;

-- Create proper parent access policy that uses the existing function
-- Parents can SELECT via the is_parent_of_kid function, but this returns full row
-- So we need to ensure they use the safe function instead
-- Keep direct SELECT blocked for parents - they MUST use get_linked_kids_profiles()
CREATE POLICY "Direct SELECT only for own profile"
ON public.kids_profiles
FOR SELECT
TO authenticated
USING (
  -- Kids can view their own profile
  user_id = auth.uid()
);

-- Note: Parents must use get_linked_kids_profiles() function which is SECURITY DEFINER
-- and excludes sensitive fields (pin_hash, security_answer, security_question)

-- =====================================================
-- FIX: plaid_items - Allow service role operations properly
-- =====================================================

-- The policies with WITH CHECK (false) were blocking all inserts
-- Service role bypasses RLS entirely, so these policies should just block client access
-- Keep them as-is since service role bypasses RLS

-- =====================================================
-- FIX: b2b_partner_referrals - Restrict what professionals can see
-- =====================================================

-- Update professional view policy to use safe view
DROP POLICY IF EXISTS "Professionals can view their own referrals" ON public.b2b_partner_referrals;

-- Professionals can only SELECT via safe view (excludes contact details)
CREATE POLICY "Professionals view referrals via safe view"
ON public.b2b_partner_referrals
FOR SELECT
TO authenticated
USING (
  -- Professionals should use b2b_partner_referrals_user_safe view
  -- Block direct access if they're trying to see referrals they submitted
  -- Allow only if they're an admin
  is_admin(auth.uid())
);

-- Update user view policy similarly
DROP POLICY IF EXISTS "Users can view their own B2B referrals" ON public.b2b_partner_referrals;

CREATE POLICY "Users view referrals via safe view"
ON public.b2b_partner_referrals
FOR SELECT
TO authenticated  
USING (
  -- Users should use b2b_partner_referrals_user_safe view
  -- Block direct access, allow only admins
  is_admin(auth.uid())
);

-- =====================================================
-- FIX: professional_applications - Tighten SELECT policy
-- =====================================================

-- Drop the email-matching policy that allows enumeration
DROP POLICY IF EXISTS "Applicants can view their own application" ON public.professional_applications;
DROP POLICY IF EXISTS "Users can view their own professional applications" ON public.professional_applications;

-- Only admins can view applications
CREATE POLICY "Only admins can view professional applications"
ON public.professional_applications
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- =====================================================
-- FIX: card_interest - Only admins can view
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view their own submissions" ON public.card_interest;
DROP POLICY IF EXISTS "Users can view their own card interest" ON public.card_interest;

CREATE POLICY "Only admins can view card interest submissions"
ON public.card_interest
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
