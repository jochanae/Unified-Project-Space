-- Create transfers table to track money movements between accounts
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own transfers"
ON public.transfers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transfers"
ON public.transfers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transfers"
ON public.transfers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transfers"
ON public.transfers FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_transfers_user_id ON public.transfers(user_id);
CREATE INDEX idx_transfers_from_account ON public.transfers(from_account_id);
CREATE INDEX idx_transfers_to_account ON public.transfers(to_account_id);

-- Create trigger for updated_at
CREATE TRIGGER update_transfers_updated_at
BEFORE UPDATE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();