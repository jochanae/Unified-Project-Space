
-- Add referrer_type enum
CREATE TYPE public.referrer_type AS ENUM ('professional', 'user');

-- Add new columns to b2b_partner_referrals
ALTER TABLE public.b2b_partner_referrals
ADD COLUMN referrer_user_id uuid REFERENCES auth.users(id),
ADD COLUMN referrer_type public.referrer_type NOT NULL DEFAULT 'professional',
ADD COLUMN base_monthly_fee numeric DEFAULT 29,
ADD COLUMN per_seat_fee numeric DEFAULT 7,
ADD COLUMN monthly_revenue numeric GENERATED ALWAYS AS (base_monthly_fee + (COALESCE(estimated_seats, 0) * per_seat_fee)) STORED,
ADD COLUMN commission_months_total integer DEFAULT 12,
ADD COLUMN commission_months_paid integer DEFAULT 0,
ADD COLUMN total_commission_paid numeric DEFAULT 0,
ADD COLUMN commission_start_date date,
ADD COLUMN last_commission_date date;

-- Update default commission_percent to be nullable so we can set based on type
-- (already nullable, but let's update the default logic in the app)

-- Add RLS policy for regular users to submit referrals
CREATE POLICY "Users can submit B2B referrals"
ON public.b2b_partner_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  referrer_user_id = auth.uid() AND referrer_type = 'user'
);

-- Add RLS policy for regular users to view their own referrals
CREATE POLICY "Users can view their own B2B referrals"
ON public.b2b_partner_referrals
FOR SELECT
TO authenticated
USING (referrer_user_id = auth.uid());

-- Add constraint to ensure either professional or user is set, but not both
ALTER TABLE public.b2b_partner_referrals
ADD CONSTRAINT referrer_check CHECK (
  (referrer_professional_id IS NOT NULL AND referrer_user_id IS NULL AND referrer_type = 'professional')
  OR
  (referrer_user_id IS NOT NULL AND referrer_professional_id IS NULL AND referrer_type = 'user')
  OR
  (referrer_professional_id IS NULL AND referrer_user_id IS NULL) -- Admin-created without referrer
);
