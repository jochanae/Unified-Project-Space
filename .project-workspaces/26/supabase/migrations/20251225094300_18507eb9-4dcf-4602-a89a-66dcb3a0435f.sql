-- Add 'skipped' to bill_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'skipped' AND enumtypid = 'bill_status'::regtype) THEN
    ALTER TYPE bill_status ADD VALUE 'skipped' AFTER 'partially_paid';
  END IF;
END $$;