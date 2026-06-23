-- Add bucket balances and split percentages to kids_profiles
ALTER TABLE public.kids_profiles
ADD COLUMN IF NOT EXISTS spend_balance numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS save_balance numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS give_balance numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS split_spend_percent integer DEFAULT 100 NOT NULL,
ADD COLUMN IF NOT EXISTS split_save_percent integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS split_give_percent integer DEFAULT 0 NOT NULL;

-- Migrate existing current_balance to spend_balance
UPDATE public.kids_profiles 
SET spend_balance = current_balance 
WHERE spend_balance = 0 AND current_balance > 0;

-- Add bucket_type to goals to track which bucket they belong to (save bucket)
ALTER TABLE public.kid_savings_goals
ADD COLUMN IF NOT EXISTS bucket_type text DEFAULT 'save' NOT NULL;

-- Add bucket field to transactions to track which bucket was affected
ALTER TABLE public.kid_transactions
ADD COLUMN IF NOT EXISTS bucket text DEFAULT 'spend';

-- Add constraint to ensure split percentages add up to 100 or less
ALTER TABLE public.kids_profiles
ADD CONSTRAINT valid_split_percentages 
CHECK (split_spend_percent + split_save_percent + split_give_percent <= 100 AND 
       split_spend_percent >= 0 AND split_save_percent >= 0 AND split_give_percent >= 0);