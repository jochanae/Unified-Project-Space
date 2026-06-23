-- Add credit-based reward fields to referrals table
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS referrer_credit_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS referee_credit_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS referrer_reward_type text DEFAULT 'tier_unlock',
ADD COLUMN IF NOT EXISTS referee_reward_type text DEFAULT 'tier_unlock';

-- Add account_credits to profiles for tracking user credits
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_credits numeric DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN public.referrals.referrer_reward_type IS 'tier_unlock (free users get Learner) or credit (paid users get $15)';
COMMENT ON COLUMN public.profiles.account_credits IS 'Account balance in USD that can be applied to subscriptions';