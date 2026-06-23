
-- Add end_date and total_payments columns to bills table
ALTER TABLE public.bills 
  ADD COLUMN end_date date DEFAULT NULL,
  ADD COLUMN total_payments integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.bills.end_date IS 'Optional end date for time-limited recurring bills';
COMMENT ON COLUMN public.bills.total_payments IS 'Optional total number of payments for time-limited recurring bills';
