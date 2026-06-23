-- Replace referrals_safe view to mask referred_email for referrers
CREATE OR REPLACE VIEW public.referrals_safe AS
SELECT 
    id,
    referrer_id,
    referral_code,
    CASE
        WHEN is_admin(auth.uid()) THEN referred_email
        WHEN (auth.uid() = referrer_id) AND referred_email IS NOT NULL THEN
            -- Mask email: show first char + *** + @domain
            concat(
                left(split_part(referred_email, '@', 1), 1),
                '***@',
                split_part(referred_email, '@', 2)
            )
        ELSE NULL::text
    END AS referred_email,
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
FROM referrals
WHERE (auth.uid() = referrer_id) 
   OR (auth.uid() = referred_user_id) 
   OR is_admin(auth.uid());