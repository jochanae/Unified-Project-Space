-- Phase 1: Enhanced Bill Payment Tracking

-- Add confirmation number field for payment receipts/confirmation codes
ALTER TABLE public.bill_payments 
ADD COLUMN IF NOT EXISTS confirmation_number text;

-- Add late fee tracking
ALTER TABLE public.bill_payments 
ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 0;

-- Add account linkage (which account was used to pay)
ALTER TABLE public.bill_payments 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Add index for account lookups
CREATE INDEX IF NOT EXISTS idx_bill_payments_account_id ON public.bill_payments(account_id);

-- Add comment for documentation
COMMENT ON COLUMN public.bill_payments.confirmation_number IS 'Payment confirmation or reference number from the payee';
COMMENT ON COLUMN public.bill_payments.late_fee_amount IS 'Any late fee incurred with this payment';
COMMENT ON COLUMN public.bill_payments.account_id IS 'The account used to make this payment';