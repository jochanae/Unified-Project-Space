-- Feedback/Bug Reports table (full suite: errors, feedback, feature requests, ratings)
CREATE TABLE public.feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('error', 'bug', 'feedback', 'feature_request', 'satisfaction')),
    title TEXT,
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    error_data JSONB,
    page_url TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can create feedback (even unauthenticated for errors)
CREATE POLICY "Anyone can create feedback"
ON public.feedback
FOR INSERT
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can manage all feedback
CREATE POLICY "Admins can manage all feedback"
ON public.feedback
FOR ALL
USING (is_admin(auth.uid()));

-- Referrals table (credit-based system)
CREATE TABLE public.referrals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL UNIQUE,
    referred_email TEXT,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted', 'rewarded')),
    referrer_reward_months INTEGER DEFAULT 1,
    referee_reward_months INTEGER DEFAULT 1,
    referrer_rewarded_at TIMESTAMP WITH TIME ZONE,
    referee_rewarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    converted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own referrals
CREATE POLICY "Users can manage their own referrals"
ON public.referrals
FOR ALL
USING (auth.uid() = referrer_id);

-- Referred users can view their referral record
CREATE POLICY "Referred users can view their referral"
ON public.referrals
FOR SELECT
USING (auth.uid() = referred_user_id);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals"
ON public.referrals
FOR ALL
USING (is_admin(auth.uid()));

-- Add referral_code to profiles for easy lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- Trigger for updated_at on feedback
CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 8));
        SELECT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_check;
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;