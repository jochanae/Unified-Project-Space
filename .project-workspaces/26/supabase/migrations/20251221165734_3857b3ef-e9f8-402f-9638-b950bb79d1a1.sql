-- Add monthly income tracking for envelope budgeting
CREATE TABLE public.monthly_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  total_income NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, year)
);

-- Enable RLS
ALTER TABLE public.monthly_income ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own monthly income"
ON public.monthly_income FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly income"
ON public.monthly_income FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly income"
ON public.monthly_income FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly income"
ON public.monthly_income FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_monthly_income_updated_at
BEFORE UPDATE ON public.monthly_income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();