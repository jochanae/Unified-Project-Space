-- Create table for custom quote requests
CREATE TABLE public.custom_quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_rate TEXT NOT NULL,
  reason TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.custom_quote_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert a quote request (including non-authenticated users)
CREATE POLICY "Anyone can submit quote requests" 
ON public.custom_quote_requests 
FOR INSERT 
WITH CHECK (true);

-- Policy: Users can view their own requests if logged in
CREATE POLICY "Users can view their own quote requests" 
ON public.custom_quote_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_custom_quote_requests_email ON public.custom_quote_requests(email);
CREATE INDEX idx_custom_quote_requests_status ON public.custom_quote_requests(status);