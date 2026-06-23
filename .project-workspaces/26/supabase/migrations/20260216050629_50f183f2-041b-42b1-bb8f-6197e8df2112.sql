-- Create table for SMS transactions that may match bills but need user confirmation
CREATE TABLE public.sms_bill_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('high', 'medium', 'low')),
  match_reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_bill_matches ENABLE ROW LEVEL SECURITY;

-- Users can view their own matches
CREATE POLICY "Users can view own SMS bill matches"
  ON public.sms_bill_matches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own matches (confirm/dismiss)
CREATE POLICY "Users can update own SMS bill matches"
  ON public.sms_bill_matches FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert
CREATE POLICY "Service role can insert SMS bill matches"
  ON public.sms_bill_matches FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Index for quick lookups
CREATE INDEX idx_sms_bill_matches_user_pending 
  ON public.sms_bill_matches(user_id, status) 
  WHERE status = 'pending';