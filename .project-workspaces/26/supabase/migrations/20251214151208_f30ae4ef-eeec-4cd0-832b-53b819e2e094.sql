-- Add phone number to profiles for SMS verification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Create SMS transactions log table
CREATE TABLE IF NOT EXISTS public.sms_transaction_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number text NOT NULL,
  message_body text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  transaction_id uuid REFERENCES public.transactions(id),
  parsed_amount numeric,
  parsed_title text,
  parsed_category text,
  status text DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_transaction_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own SMS logs
CREATE POLICY "Users can view own SMS logs" ON public.sms_transaction_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update
CREATE POLICY "Service role full access to SMS logs" ON public.sms_transaction_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');