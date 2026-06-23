-- Add receipt_url column to goal_contributions for collaborative accountability
ALTER TABLE public.goal_contributions 
ADD COLUMN IF NOT EXISTS receipt_url text;

-- Add receipt_url column to budget_transactions for collaborative accountability
ALTER TABLE public.budget_transactions 
ADD COLUMN IF NOT EXISTS receipt_url text;