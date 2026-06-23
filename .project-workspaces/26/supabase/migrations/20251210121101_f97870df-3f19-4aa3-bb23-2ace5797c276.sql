-- Create account type enum
CREATE TYPE public.account_type AS ENUM (
  'checking', 'savings', 'money_market', 'cd',
  'credit_card', 'line_of_credit',
  'mortgage', 'heloc',
  'auto_loan', 'student_loan', 'personal_loan',
  'investment', 'brokerage',
  'retirement_401k', 'retirement_ira', 'retirement_roth',
  'real_estate', 'vehicle',
  'insurance', 'annuity',
  'crypto', 'other'
);

-- Create account category enum
CREATE TYPE public.account_category AS ENUM ('asset', 'liability');

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  institution TEXT,
  account_number_masked TEXT,
  account_type public.account_type NOT NULL DEFAULT 'checking',
  category public.account_category NOT NULL DEFAULT 'asset',
  balance NUMERIC NOT NULL DEFAULT 0,
  is_manual BOOLEAN NOT NULL DEFAULT true,
  plaid_account_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON public.accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();