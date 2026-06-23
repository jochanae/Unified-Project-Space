-- Add income_source column to transactions table for tagging income by source
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS income_source text;

-- Add an index for efficient filtering by income source
CREATE INDEX IF NOT EXISTS idx_transactions_income_source ON public.transactions (user_id, income_source) WHERE income_source IS NOT NULL;