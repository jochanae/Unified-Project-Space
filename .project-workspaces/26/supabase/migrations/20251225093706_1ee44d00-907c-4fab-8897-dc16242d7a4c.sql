-- Add 'partially_paid' to bill_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'partially_paid' AND enumtypid = 'bill_status'::regtype) THEN
    ALTER TYPE bill_status ADD VALUE 'partially_paid' AFTER 'pending';
  END IF;
END $$;

-- Add remaining_balance column to bills table (tracks what's left to pay)
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS remaining_balance numeric DEFAULT NULL;

-- Initialize remaining_balance for existing bills based on their payments
UPDATE public.bills b
SET remaining_balance = b.amount - COALESCE(
  (SELECT SUM(bp.amount) FROM public.bill_payments bp WHERE bp.bill_id = b.id), 
  0
)
WHERE b.remaining_balance IS NULL;