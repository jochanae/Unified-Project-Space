-- Create credit_scores table for tracking user credit scores over time
CREATE TABLE public.credit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
  bureau TEXT NOT NULL DEFAULT 'Experian',
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own credit scores"
ON public.credit_scores
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit scores"
ON public.credit_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit scores"
ON public.credit_scores
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit scores"
ON public.credit_scores
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_credit_scores_updated_at
BEFORE UPDATE ON public.credit_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();