-- Create table to track professional profile views
CREATE TABLE public.professional_profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip_hash text,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  referrer_url text
);

-- Create index for faster lookups
CREATE INDEX idx_professional_views_professional_id ON public.professional_profile_views(professional_id);
CREATE INDEX idx_professional_views_viewed_at ON public.professional_profile_views(viewed_at);

-- Enable RLS
ALTER TABLE public.professional_profile_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (public profile)
CREATE POLICY "Anyone can record profile views"
ON public.professional_profile_views
FOR INSERT
WITH CHECK (true);

-- Professionals can view their own stats
CREATE POLICY "Professionals can view their own profile views"
ON public.professional_profile_views
FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all profile views"
ON public.professional_profile_views
FOR SELECT
USING (is_admin(auth.uid()));

-- Partner admins can view their professionals' stats
CREATE POLICY "Partner admins can view their professionals stats"
ON public.professional_profile_views
FOR SELECT
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    JOIN public.partners pt ON p.partner_id = pt.id
    WHERE pt.owner_user_id = auth.uid()
  )
);

-- Create table to track referral signups from professionals
CREATE TABLE public.professional_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email text,
  signup_completed boolean DEFAULT false,
  converted_to_premium boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  converted_at timestamp with time zone
);

-- Create indexes
CREATE INDEX idx_professional_referrals_professional_id ON public.professional_referrals(professional_id);
CREATE INDEX idx_professional_referrals_created_at ON public.professional_referrals(created_at);

-- Enable RLS
ALTER TABLE public.professional_referrals ENABLE ROW LEVEL SECURITY;

-- Allow inserts for tracking referrals
CREATE POLICY "System can insert referrals"
ON public.professional_referrals
FOR INSERT
WITH CHECK (true);

-- Professionals can view their own referrals
CREATE POLICY "Professionals can view their own referrals"
ON public.professional_referrals
FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
ON public.professional_referrals
FOR SELECT
USING (is_admin(auth.uid()));

-- Partner admins can view their professionals' referrals
CREATE POLICY "Partner admins can view their professionals referrals"
ON public.professional_referrals
FOR SELECT
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    JOIN public.partners pt ON p.partner_id = pt.id
    WHERE pt.owner_user_id = auth.uid()
  )
);