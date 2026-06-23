-- Create budget categories enum
CREATE TYPE public.budget_category AS ENUM (
  'housing',
  'transportation',
  'food',
  'utilities',
  'healthcare',
  'insurance',
  'savings',
  'entertainment',
  'shopping',
  'personal',
  'education',
  'debt',
  'gifts',
  'travel',
  'other'
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category budget_category NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for budgets
CREATE POLICY "Users can view their own budgets"
ON public.budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
ON public.budgets FOR DELETE
USING (auth.uid() = user_id);

-- Create budget transactions table for tracking spending
CREATE TABLE public.budget_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget transactions
CREATE POLICY "Users can view their own budget transactions"
ON public.budget_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget transactions"
ON public.budget_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget transactions"
ON public.budget_transactions FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on budgets
CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_transactions;