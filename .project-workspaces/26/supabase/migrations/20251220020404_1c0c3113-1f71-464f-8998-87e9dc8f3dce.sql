-- Create enum for B2B referral status
CREATE TYPE public.b2b_referral_status AS ENUM ('pending', 'contacted', 'negotiating', 'converted', 'rejected');

-- Create enum for payout status
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'paid');

-- Create B2B partner referrals table
CREATE TABLE public.b2b_partner_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  referred_business_name TEXT NOT NULL,
  referred_contact_name TEXT,
  referred_contact_email TEXT,
  referred_contact_phone TEXT,
  business_type TEXT, -- e.g., 'credit_union', 'employer', 'financial_institution'
  estimated_seats INTEGER, -- estimated number of users
  status b2b_referral_status NOT NULL DEFAULT 'pending',
  deal_value NUMERIC DEFAULT 0, -- total contract value
  commission_percent NUMERIC DEFAULT 10, -- % of deal
  commission_amount NUMERIC DEFAULT 0, -- calculated payout
  payout_status payout_status NOT NULL DEFAULT 'pending',
  payout_date DATE,
  payout_method TEXT, -- 'paypal', 'bank_transfer', 'check', 'stripe'
  payout_reference TEXT, -- transaction ID or check number
  notes TEXT,
  admin_notes TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.b2b_partner_referrals ENABLE ROW LEVEL SECURITY;

-- Only admins can view B2B referrals
CREATE POLICY "Admins can view B2B referrals"
ON public.b2b_partner_referrals
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can insert B2B referrals
CREATE POLICY "Admins can create B2B referrals"
ON public.b2b_partner_referrals
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update B2B referrals
CREATE POLICY "Admins can update B2B referrals"
ON public.b2b_partner_referrals
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete B2B referrals
CREATE POLICY "Admins can delete B2B referrals"
ON public.b2b_partner_referrals
FOR DELETE
USING (is_admin(auth.uid()));

-- Professionals can submit referrals (insert only)
CREATE POLICY "Professionals can submit referrals"
ON public.b2b_partner_referrals
FOR INSERT
WITH CHECK (
  referrer_professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Professionals can view their own referrals
CREATE POLICY "Professionals can view their own referrals"
ON public.b2b_partner_referrals
FOR SELECT
USING (
  referrer_professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_b2b_partner_referrals_updated_at
BEFORE UPDATE ON public.b2b_partner_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();