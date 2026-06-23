-- Add 'business' to the bill_category enum
ALTER TYPE public.bill_category ADD VALUE IF NOT EXISTS 'business';

-- Add 'business' to the budget_category enum so budget tracking works too
ALTER TYPE public.budget_category ADD VALUE IF NOT EXISTS 'business';