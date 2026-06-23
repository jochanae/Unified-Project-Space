-- Create table for credit accounts (utilization tracking)
CREATE TABLE public.credit_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_accounts
CREATE POLICY "Users can view their own credit accounts" 
ON public.credit_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit accounts" 
ON public.credit_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit accounts" 
ON public.credit_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit accounts" 
ON public.credit_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create table for credit score goals
CREATE TABLE public.credit_score_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_score INTEGER NOT NULL,
  target_date DATE,
  starting_score INTEGER NOT NULL,
  current_score INTEGER,
  is_achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_score_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_score_goals
CREATE POLICY "Users can view their own credit goals" 
ON public.credit_score_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit goals" 
ON public.credit_score_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit goals" 
ON public.credit_score_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit goals" 
ON public.credit_score_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at on credit_score_goals
CREATE TRIGGER update_credit_score_goals_updated_at
BEFORE UPDATE ON public.credit_score_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();