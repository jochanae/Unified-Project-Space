-- Fix the security definer view issue by using SECURITY INVOKER (default)
-- and properly applying RLS through the underlying table

DROP VIEW IF EXISTS public.referrals_safe;

-- Recreate without security definer (SECURITY INVOKER is default and safe)
CREATE VIEW public.referrals_safe 
WITH (security_invoker = true)
AS
SELECT
    id,
    referrer_id,
    referral_code,
    -- Only show email to admins, mask for regular users
    CASE 
        WHEN is_admin(auth.uid()) THEN referred_email
        ELSE NULL
    END as referred_email,
    referred_user_id,
    status,
    converted_at,
    referrer_reward_type,
    referrer_reward_months,
    referrer_credit_amount,
    referrer_rewarded_at,
    referee_reward_type,
    referee_reward_months,
    referee_credit_amount,
    referee_rewarded_at,
    created_at
FROM public.referrals;

-- Grant access to the view
GRANT SELECT ON public.referrals_safe TO authenticated;