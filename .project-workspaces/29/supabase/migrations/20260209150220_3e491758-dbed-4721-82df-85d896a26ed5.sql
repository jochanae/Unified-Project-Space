
-- 1. Add kid_profile_id to kid_goals (nullable for backward compat)
ALTER TABLE public.kid_goals 
ADD COLUMN IF NOT EXISTS kid_profile_id UUID REFERENCES public.kid_profiles(id) ON DELETE CASCADE;

-- 2. Add kid_profile_id to conversations for kid-specific Quinn chats (nullable - only set in kid mode)
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS kid_profile_id UUID REFERENCES public.kid_profiles(id) ON DELETE SET NULL;

-- 3. Create kid_achievements table to persist stars/badges per child
CREATE TABLE IF NOT EXISTS public.kid_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kid_profile_id UUID NOT NULL REFERENCES public.kid_profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL DEFAULT 'star', -- 'star', 'badge', 'streak'
  achievement_id TEXT NOT NULL, -- e.g. lesson id, milestone name
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '⭐',
  metadata JSONB DEFAULT '{}'::jsonb,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kid_profile_id, achievement_type, achievement_id)
);

-- Enable RLS on kid_achievements
ALTER TABLE public.kid_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own kid achievements"
ON public.kid_achievements
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create a trigger function to auto-create a kid_portfolio when a kid_profile is created
CREATE OR REPLACE FUNCTION public.create_kid_portfolio_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_portfolio_id UUID;
BEGIN
  -- Create a new portfolio for this kid
  INSERT INTO public.kid_portfolios (user_id, balance, initial_balance)
  VALUES (NEW.user_id, 1000, 1000)
  RETURNING id INTO new_portfolio_id;

  -- Link the portfolio to the kid profile
  UPDATE public.kid_profiles 
  SET portfolio_id = new_portfolio_id 
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS create_kid_portfolio_trigger ON public.kid_profiles;
CREATE TRIGGER create_kid_portfolio_trigger
AFTER INSERT ON public.kid_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_kid_portfolio_on_profile();

-- 5. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kid_goals_kid_profile_id ON public.kid_goals(kid_profile_id);
CREATE INDEX IF NOT EXISTS idx_kid_achievements_kid_profile_id ON public.kid_achievements(kid_profile_id);
CREATE INDEX IF NOT EXISTS idx_conversations_kid_profile_id ON public.conversations(kid_profile_id);
