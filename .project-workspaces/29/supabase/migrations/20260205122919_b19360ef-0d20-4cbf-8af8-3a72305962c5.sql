-- Create table to store user preferences/context for Quinn
CREATE TABLE public.user_quinn_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  has_brokerage BOOLEAN DEFAULT NULL,
  brokerage_names TEXT[] DEFAULT NULL,
  experience_level TEXT DEFAULT NULL, -- 'beginner', 'intermediate', 'advanced'
  primary_goals TEXT[] DEFAULT NULL,
  risk_tolerance TEXT DEFAULT NULL, -- 'conservative', 'moderate', 'aggressive'
  investment_timeline TEXT DEFAULT NULL, -- 'short', 'medium', 'long'
  has_emergency_fund BOOLEAN DEFAULT NULL,
  has_debt BOOLEAN DEFAULT NULL,
  age_range TEXT DEFAULT NULL,
  occupation TEXT DEFAULT NULL,
  additional_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_quinn_context ENABLE ROW LEVEL SECURITY;

-- Users can only access their own context
CREATE POLICY "Users can view their own context"
  ON public.user_quinn_context
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context"
  ON public.user_quinn_context
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context"
  ON public.user_quinn_context
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_quinn_context_updated_at
  BEFORE UPDATE ON public.user_quinn_context
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();