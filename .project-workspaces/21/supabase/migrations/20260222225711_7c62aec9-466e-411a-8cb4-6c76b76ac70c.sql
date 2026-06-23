
-- Persist Cami matchmaking conversation state
CREATE TABLE public.matchmaking_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  phase text NOT NULL DEFAULT 'intro',
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  gender_preference text NOT NULL DEFAULT 'neutral',
  connection_mode text NOT NULL DEFAULT 'unsure',
  match_result jsonb,
  fast_track_text text,
  appearance_desc text,
  private_mode boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- One active session per user
CREATE UNIQUE INDEX idx_matchmaking_sessions_user ON public.matchmaking_sessions (user_id);

ALTER TABLE public.matchmaking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matchmaking session"
  ON public.matchmaking_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own matchmaking session"
  ON public.matchmaking_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matchmaking session"
  ON public.matchmaking_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matchmaking session"
  ON public.matchmaking_sessions FOR DELETE
  USING (auth.uid() = user_id);
