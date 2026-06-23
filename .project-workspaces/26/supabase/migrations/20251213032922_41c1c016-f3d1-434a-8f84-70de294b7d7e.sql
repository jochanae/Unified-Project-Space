-- Create table for card interest/waitlist signups
CREATE TABLE public.card_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  has_kids BOOLEAN DEFAULT false,
  family_size INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public inserts (waitlist is public)
ALTER TABLE public.card_interest ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit interest (public waitlist)
CREATE POLICY "Anyone can submit card interest"
ON public.card_interest
FOR INSERT
WITH CHECK (true);

-- Only admins can view submissions (we'll handle this in app logic)
CREATE POLICY "Authenticated users can view their own submissions"
ON public.card_interest
FOR SELECT
USING (email = current_setting('request.jwt.claims', true)::json->>'email');