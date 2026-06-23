
-- Create kid_profiles table for personalized kid experience
CREATE TABLE public.kid_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_id UUID REFERENCES public.kid_portfolios(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_preset TEXT NOT NULL DEFAULT 'astronaut',
  avatar_url TEXT,
  card_design TEXT NOT NULL DEFAULT 'galaxy',
  pin_hash TEXT,
  allowance_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.kid_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own kid profile"
ON public.kid_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create allowance_transactions table
CREATE TABLE public.allowance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kid_profile_id UUID NOT NULL REFERENCES public.kid_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'deposit',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own allowance transactions"
ON public.allowance_transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for kid_profiles
CREATE TRIGGER update_kid_profiles_updated_at
BEFORE UPDATE ON public.kid_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
