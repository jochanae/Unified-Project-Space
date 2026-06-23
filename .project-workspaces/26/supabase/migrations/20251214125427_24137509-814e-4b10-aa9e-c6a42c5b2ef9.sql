-- Add is_archived column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Create index for faster filtering of non-archived transactions
CREATE INDEX IF NOT EXISTS idx_transactions_archived ON public.transactions(user_id, is_archived);