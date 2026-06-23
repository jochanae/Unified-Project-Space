-- Add missing columns to transactions table for unified transaction modal
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS merchant TEXT,
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS bloom_burst_id UUID REFERENCES public.bloom_bursts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bloom_burst_id ON public.transactions(bloom_burst_id);