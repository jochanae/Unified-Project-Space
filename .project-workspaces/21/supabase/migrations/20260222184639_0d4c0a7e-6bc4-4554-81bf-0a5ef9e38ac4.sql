
-- Journal entries: guided journaling with companion prompts
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT,
  content TEXT NOT NULL,
  mood_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Mood check-ins: quick daily mood tracking
CREATE TABLE public.mood_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood_level INTEGER NOT NULL,
  mood_emoji TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mood checkins"
  ON public.mood_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood checkins"
  ON public.mood_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood checkins"
  ON public.mood_checkins FOR DELETE
  USING (auth.uid() = user_id);

-- Gratitude entries: daily gratitude items
CREATE TABLE public.gratitude_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gratitude entries"
  ON public.gratitude_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gratitude entries"
  ON public.gratitude_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gratitude entries"
  ON public.gratitude_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_journal_entries_user_date ON public.journal_entries (user_id, created_at DESC);
CREATE INDEX idx_mood_checkins_user_date ON public.mood_checkins (user_id, created_at DESC);
CREATE INDEX idx_gratitude_entries_user_date ON public.gratitude_entries (user_id, created_at DESC);
