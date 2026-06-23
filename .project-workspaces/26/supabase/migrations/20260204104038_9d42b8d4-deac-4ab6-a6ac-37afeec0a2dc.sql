-- Create user referrals table for consumer referral program
CREATE TABLE public.user_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  credits_earned NUMERIC NOT NULL DEFAULT 0,
  credits_used NUMERIC NOT NULL DEFAULT 0,
  referral_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral tracking table for tracking who referred whom
CREATE TABLE public.referral_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, converted, credited
  credit_amount NUMERIC DEFAULT 0,
  converted_at TIMESTAMP WITH TIME ZONE,
  credited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_referrals
CREATE POLICY "Users can view their own referral info" 
ON public.user_referrals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral" 
ON public.user_referrals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral" 
ON public.user_referrals 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for referral_conversions
CREATE POLICY "Users can view conversions they referred" 
ON public.referral_conversions 
FOR SELECT 
USING (auth.uid() = referrer_user_id);

CREATE POLICY "Anyone can create a conversion record on signup" 
ON public.referral_conversions 
FOR INSERT 
WITH CHECK (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to create referral record for new users
CREATE OR REPLACE FUNCTION public.create_user_referral()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Generate unique code
  LOOP
    new_code := generate_referral_code();
    SELECT EXISTS(SELECT 1 FROM public.user_referrals WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert referral record
  INSERT INTO public.user_referrals (user_id, referral_code)
  VALUES (NEW.id, new_code);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create referral code on user signup
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_referral();

-- Create indexes
CREATE INDEX idx_user_referrals_user_id ON public.user_referrals(user_id);
CREATE INDEX idx_user_referrals_code ON public.user_referrals(referral_code);
CREATE INDEX idx_referral_conversions_referrer ON public.referral_conversions(referrer_user_id);
CREATE INDEX idx_referral_conversions_code ON public.referral_conversions(referral_code);

-- Create updated_at trigger for user_referrals
CREATE TRIGGER update_user_referrals_updated_at
BEFORE UPDATE ON public.user_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();