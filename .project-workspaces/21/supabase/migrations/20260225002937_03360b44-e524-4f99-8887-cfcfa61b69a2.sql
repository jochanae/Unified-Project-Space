-- Create user_badges table for the badge system
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_emoji TEXT NOT NULL DEFAULT '🏅',
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'learn',
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own badges
CREATE POLICY "Users can insert their own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all badges
CREATE POLICY "Admins can view all badges"
  ON public.user_badges FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users cannot delete or update badges (they are permanent achievements)
