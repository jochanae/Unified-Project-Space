-- Fix profiles table RLS - remove the dangerous partner_id IS NULL condition
DROP POLICY IF EXISTS "Partners can view their users via safe view only" ON public.profiles;

-- Create a proper policy that only allows admins to view partner users
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Fix B2B referrals - allow professionals and users to see only their own referrals
DROP POLICY IF EXISTS "Professionals view referrals via safe view" ON public.b2b_partner_referrals;
DROP POLICY IF EXISTS "Users view referrals via safe view" ON public.b2b_partner_referrals;

-- Professionals can view their own referrals
CREATE POLICY "Professionals can view their own referrals" 
ON public.b2b_partner_referrals 
FOR SELECT 
USING (
  referrer_professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Users can view their own referrals
CREATE POLICY "Users can view their own referrals" 
ON public.b2b_partner_referrals 
FOR SELECT 
USING (referrer_user_id = auth.uid());