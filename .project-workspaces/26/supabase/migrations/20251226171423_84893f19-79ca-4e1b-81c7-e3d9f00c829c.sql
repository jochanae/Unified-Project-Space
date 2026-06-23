-- Create table to store tax-related details for bills (PITI breakdown, etc.)
CREATE TABLE public.bill_tax_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- PITI breakdown for mortgages
  principal_amount NUMERIC DEFAULT 0,
  interest_amount NUMERIC DEFAULT 0,
  property_tax_amount NUMERIC DEFAULT 0,
  insurance_amount NUMERIC DEFAULT 0,
  
  -- General tax tracking
  is_tax_deductible BOOLEAN DEFAULT false,
  deductible_amount NUMERIC DEFAULT 0,
  deduction_category TEXT DEFAULT 'other', -- mortgage_interest, property_tax, state_tax, etc.
  
  -- For student loans
  student_loan_interest NUMERIC DEFAULT 0,
  
  tax_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(bill_id, tax_year)
);

-- Enable Row Level Security
ALTER TABLE public.bill_tax_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bill tax details" 
ON public.bill_tax_details 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bill tax details" 
ON public.bill_tax_details 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill tax details" 
ON public.bill_tax_details 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill tax details" 
ON public.bill_tax_details 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bill_tax_details_updated_at
BEFORE UPDATE ON public.bill_tax_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add mortgage category to bills if not exists (via updating the enum or just using text)
-- Since category is already a custom enum, we'll add mortgage as a category
-- First check what the bill_category enum contains and add mortgage
ALTER TYPE public.bill_category ADD VALUE IF NOT EXISTS 'mortgage';
ALTER TYPE public.bill_category ADD VALUE IF NOT EXISTS 'property_tax';
ALTER TYPE public.bill_category ADD VALUE IF NOT EXISTS 'student_loan';
ALTER TYPE public.bill_category ADD VALUE IF NOT EXISTS 'medical';