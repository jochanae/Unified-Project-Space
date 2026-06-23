-- Add stripe_subscription_id to b2b_partner_referrals to link referrals to partner subscriptions
ALTER TABLE public.b2b_partner_referrals 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id);

-- Add stripe_connect_account_id to professionals for auto-payout capability
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'manual'; -- 'manual' or 'stripe_connect'

-- Add stripe_connect fields to profiles for regular users who refer
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'manual';

-- Create referral_commission_payments table to track each monthly commission
CREATE TABLE IF NOT EXISTS public.referral_commission_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id uuid NOT NULL REFERENCES public.b2b_partner_referrals(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id),
  month_number integer NOT NULL, -- Which month of the 12-month commission period (1-12)
  commission_amount numeric NOT NULL DEFAULT 0,
  partner_payment_amount numeric NOT NULL DEFAULT 0, -- What the partner paid that month
  stripe_invoice_id text, -- The Stripe invoice that triggered this
  status text NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
  payout_method text DEFAULT 'manual', -- manual, stripe_connect
  stripe_transfer_id text, -- If paid via Stripe Connect
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on referral_commission_payments
ALTER TABLE public.referral_commission_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_commission_payments
CREATE POLICY "Admins can manage commission payments"
ON public.referral_commission_payments
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Professionals can view their commission payments"
ON public.referral_commission_payments
FOR SELECT
USING (
  referral_id IN (
    SELECT id FROM public.b2b_partner_referrals 
    WHERE referrer_professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view their commission payments"
ON public.referral_commission_payments
FOR SELECT
USING (
  referral_id IN (
    SELECT id FROM public.b2b_partner_referrals 
    WHERE referrer_user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_commission_payments_referral_id ON public.referral_commission_payments(referral_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_status ON public.referral_commission_payments(status);
CREATE INDEX IF NOT EXISTS idx_b2b_referrals_stripe_sub ON public.b2b_partner_referrals(stripe_subscription_id);

-- Trigger to update updated_at
CREATE TRIGGER update_commission_payments_updated_at
BEFORE UPDATE ON public.referral_commission_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();