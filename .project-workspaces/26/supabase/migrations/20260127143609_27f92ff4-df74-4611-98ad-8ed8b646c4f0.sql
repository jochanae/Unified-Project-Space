
-- Fix overly permissive RLS policies

-- 1. Fix budget_alerts - should only allow authenticated users to insert their own alerts
DROP POLICY IF EXISTS "System can insert alerts for users" ON public.budget_alerts;
CREATE POLICY "Users can insert own alerts"
ON public.budget_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Fix professional_profile_views - limit to authenticated users or anonymous viewing
-- This table tracks views, so we allow authenticated users to record their own views
DROP POLICY IF EXISTS "Anyone can record profile views" ON public.professional_profile_views;
CREATE POLICY "Authenticated users can record profile views"
ON public.professional_profile_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_user_id OR viewer_user_id IS NULL);

-- 3. Fix professional_referrals - should only allow inserts where the professional_id matches or service_role
-- The referred_user_id is the user being referred, not the referrer
DROP POLICY IF EXISTS "System can insert referrals" ON public.professional_referrals;
CREATE POLICY "Authenticated users can create referrals"
ON public.professional_referrals
FOR INSERT
TO authenticated
WITH CHECK (true); -- Will be restricted by professional ownership check

-- Actually, let me reconsider - this table tracks referrals made by professionals
-- The professional needs to be able to insert referrals they make
-- Let's check if there's a way to validate professional ownership
DROP POLICY IF EXISTS "Authenticated users can create referrals" ON public.professional_referrals;
CREATE POLICY "Professionals can create referrals"
ON public.professional_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professionals 
    WHERE id = professional_id AND user_id = auth.uid()
  )
);

-- 4. Fix rate_limits - should only be managed by service_role (used by edge functions)
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role manages rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
