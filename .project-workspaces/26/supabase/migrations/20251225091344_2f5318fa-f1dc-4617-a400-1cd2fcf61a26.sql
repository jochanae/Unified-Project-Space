-- Add scheduled payment date to bills table
ALTER TABLE public.bills 
ADD COLUMN scheduled_payment_date date DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.bills.scheduled_payment_date IS 'Date when user plans to pay this bill (optional scheduling feature)';