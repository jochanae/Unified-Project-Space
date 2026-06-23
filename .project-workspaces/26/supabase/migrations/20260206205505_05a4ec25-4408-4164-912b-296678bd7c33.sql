
-- Create bloom_coach_profiles table for persistent "Bloom Knows Me" memory
CREATE TABLE public.bloom_coach_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Life situation
  age_range TEXT, -- e.g. '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  employment_type TEXT, -- e.g. 'full-time', 'part-time', 'freelance', 'self-employed', 'retired', 'student'
  family_status TEXT, -- e.g. 'single', 'married', 'partnered', 'single-parent', 'family'
  has_dependents BOOLEAN DEFAULT false,
  num_dependents INTEGER DEFAULT 0,
  -- Financial basics
  income_range TEXT, -- e.g. 'under-25k', '25k-50k', '50k-75k', '75k-100k', '100k-150k', '150k+'
  financial_literacy TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  top_financial_goals TEXT[] DEFAULT '{}', -- e.g. ['emergency-fund', 'debt-payoff', 'save-for-home']
  biggest_challenge TEXT, -- e.g. 'overspending', 'debt', 'saving', 'investing', 'budgeting'
  risk_tolerance TEXT, -- e.g. 'conservative', 'moderate', 'aggressive'
  -- Preferences
  coaching_style TEXT DEFAULT 'balanced', -- 'motivational', 'direct', 'balanced', 'detailed'
  -- Metadata
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bloom_coach_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own profile
CREATE POLICY "Users can view their own coach profile"
ON public.bloom_coach_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coach profile"
ON public.bloom_coach_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach profile"
ON public.bloom_coach_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bloom_coach_profiles_updated_at
BEFORE UPDATE ON public.bloom_coach_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
