-- Add premium subscription caching to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS premium_checked_at timestamp with time zone;

-- Create index for premium lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium) WHERE is_premium = true;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.is_premium IS 'Cached premium subscription status - updated by webhook or periodic check';
COMMENT ON COLUMN public.profiles.premium_until IS 'Subscription end date if premium';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID for faster lookups';
COMMENT ON COLUMN public.profiles.premium_checked_at IS 'Last time premium status was verified with Stripe';