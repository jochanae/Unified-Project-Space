-- Add variable amount indicator to bills
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS is_variable_amount boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.bills.is_variable_amount IS 'Indicates if bill amount varies each period (e.g., utility bills)';