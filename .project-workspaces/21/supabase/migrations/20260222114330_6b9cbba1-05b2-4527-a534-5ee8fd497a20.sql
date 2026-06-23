
-- Table for tracking companion milestones per user per companion member
CREATE TABLE public.companion_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  member_id text NOT NULL,
  milestone_type text NOT NULL, -- 'first_message', '7_day_streak', '30_day_streak', 'vulnerable_share', 'crisis_followup'
  achieved_at timestamp with time zone NOT NULL DEFAULT now(),
  moment_delivered boolean NOT NULL DEFAULT false,
  video_url text, -- for future HeyGen integration
  UNIQUE(user_id, member_id, milestone_type)
);

ALTER TABLE public.companion_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own milestones"
ON public.companion_milestones FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones"
ON public.companion_milestones FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones"
ON public.companion_milestones FOR UPDATE
USING (auth.uid() = user_id);
