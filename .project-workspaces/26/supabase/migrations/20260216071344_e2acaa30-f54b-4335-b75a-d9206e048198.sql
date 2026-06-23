
-- Add linking columns to bills table for cross-feature communication
ALTER TABLE public.bills ADD COLUMN linked_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.bills ADD COLUMN linked_debt_id uuid REFERENCES public.debts(id) ON DELETE SET NULL;

-- Add indexes for efficient lookups
CREATE INDEX idx_bills_linked_account_id ON public.bills(linked_account_id) WHERE linked_account_id IS NOT NULL;
CREATE INDEX idx_bills_linked_debt_id ON public.bills(linked_debt_id) WHERE linked_debt_id IS NOT NULL;
