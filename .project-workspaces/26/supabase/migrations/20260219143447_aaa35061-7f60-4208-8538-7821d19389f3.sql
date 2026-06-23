
-- Add column for storing last 4 digits of external autopay account
ALTER TABLE public.bills ADD COLUMN autopay_account_last_four text;
