-- Add receipt_url column to transactions table if not exists
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS receipt_url text;