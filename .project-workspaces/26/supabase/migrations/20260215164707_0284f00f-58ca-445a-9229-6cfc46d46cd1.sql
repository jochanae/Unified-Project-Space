-- Add late_fee_amount column to bills table for tracking expected late fees
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 0;