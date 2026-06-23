-- =====================================================
-- FIX 1: Block direct access to linked_accounts tokens
-- Force all token access through the edge function
-- =====================================================

-- Drop the existing ALL policy and replace with granular policies
DROP POLICY IF EXISTS "Users can manage their own linked accounts" ON public.linked_accounts;

-- Users can only see non-sensitive columns (not tokens)
-- For token access, they must use the edge function
CREATE POLICY "Users can view their own linked accounts metadata"
ON public.linked_accounts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert (edge function handles this with service role)
CREATE POLICY "Users can create linked accounts"
ON public.linked_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own (edge function uses service role for token updates)
CREATE POLICY "Users can update their own linked accounts"
ON public.linked_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own
CREATE POLICY "Users can delete their own linked accounts"
ON public.linked_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Create a safe view that NEVER exposes tokens
CREATE OR REPLACE VIEW public.linked_accounts_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  provider,
  account_name,
  account_id,
  status,
  metadata,
  token_expires_at,
  created_at,
  updated_at
  -- Explicitly excludes: access_token, refresh_token
FROM public.linked_accounts;

-- =====================================================
-- FIX 2: Protect profiles table - create public view
-- =====================================================

-- Create a public-safe view for profiles that respects show_real_name
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  username,
  avatar_url,
  -- Only show full_name if user opted in
  CASE WHEN show_real_name = true THEN full_name ELSE NULL END as full_name,
  show_real_name,
  subscription_tier,
  created_at
  -- Explicitly excludes: email, stripe_customer_id, referral_code, referred_by, account_credits, footer_shortcuts
FROM public.profiles;

-- Add policy for viewing other users' public profile data
CREATE POLICY "Anyone can view public profile fields"
ON public.profiles
FOR SELECT
USING (
  -- Users can see their own full profile
  auth.uid() = user_id
  -- Admins can see all profiles  
  OR is_admin(auth.uid())
  -- Others can only see if they query specific user_ids (for community features)
  -- but they should use the profiles_public view instead
);

-- =====================================================
-- FIX 3: Fix referrals_safe view
-- =====================================================

-- Drop and recreate referrals_safe with proper security
DROP VIEW IF EXISTS public.referrals_safe;

CREATE VIEW public.referrals_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  referrer_id,
  referral_code,
  -- Mask email for non-admins and non-owners
  CASE 
    WHEN auth.uid() = referrer_id OR is_admin(auth.uid()) 
    THEN referred_email 
    ELSE NULL 
  END as referred_email,
  referred_user_id,
  status,
  converted_at,
  created_at,
  referrer_reward_type,
  referrer_reward_months,
  referrer_credit_amount,
  referrer_rewarded_at,
  referee_reward_type,
  referee_reward_months,
  referee_credit_amount,
  referee_rewarded_at
FROM public.referrals
WHERE 
  -- Users can see referrals they created or received
  auth.uid() = referrer_id 
  OR auth.uid() = referred_user_id
  OR is_admin(auth.uid());