-- Add payment_url column to bills, debts, and accounts tables
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_url text;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS payment_url text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS payment_url text;