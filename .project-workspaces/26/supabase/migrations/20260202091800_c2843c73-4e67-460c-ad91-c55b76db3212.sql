-- Create table for pending email-detected bills that need user confirmation
CREATE TABLE public.pending_email_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_email_id TEXT NOT NULL,
  from_address TEXT,
  subject TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  detected_payee TEXT NOT NULL,
  detected_amount NUMERIC,
  detected_due_date DATE,
  detected_category TEXT,
  confidence_score NUMERIC DEFAULT 0.5,
  raw_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_email_id)
);

-- Enable RLS
ALTER TABLE public.pending_email_bills ENABLE ROW LEVEL SECURITY;

-- Users can only see their own pending bills
CREATE POLICY "Users can view own pending email bills"
ON public.pending_email_bills
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own pending bills (approve/reject)
CREATE POLICY "Users can update own pending email bills"
ON public.pending_email_bills
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only service role can insert (from edge function)
CREATE POLICY "Service role can insert pending email bills"
ON public.pending_email_bills
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create table for Gmail connection tokens
CREATE TABLE public.gmail_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  gmail_address TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connection
CREATE POLICY "Users can view own gmail connection"
ON public.gmail_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own connection (disconnect)
CREATE POLICY "Users can delete own gmail connection"
ON public.gmail_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role can manage all (for token refresh)
CREATE POLICY "Service role can manage gmail connections"
ON public.gmail_connections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_pending_email_bills_updated_at
BEFORE UPDATE ON public.pending_email_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gmail_connections_updated_at
BEFORE UPDATE ON public.gmail_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();