-- Fix 1: Create a secure view for referrals that hides email from non-admins
-- Users can still see their referral status, but not the email address

-- Create a view that masks referred_email for non-admin users
CREATE OR REPLACE VIEW public.referrals_safe AS
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

-- Fix 2: Create a separate table for sensitive payment info (admin-only)
CREATE TABLE IF NOT EXISTS public.user_payment_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - admin only access
ALTER TABLE public.user_payment_info ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access payment info
CREATE POLICY "Service role and admins can manage payment info"
ON public.user_payment_info
FOR ALL
USING (is_admin(auth.uid()));

-- Migrate existing stripe_customer_id data to new table
INSERT INTO public.user_payment_info (user_id, stripe_customer_id)
SELECT user_id, stripe_customer_id
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id;

-- Add updated_at trigger
CREATE TRIGGER update_user_payment_info_updated_at
BEFORE UPDATE ON public.user_payment_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();