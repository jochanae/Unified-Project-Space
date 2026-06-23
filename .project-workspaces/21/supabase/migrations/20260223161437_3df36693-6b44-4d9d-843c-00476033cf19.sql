
-- Table to archive completed Cami matchmaking sessions for history
CREATE TABLE public.cami_session_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_message TEXT NOT NULL DEFAULT '',
  message_count INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL DEFAULT 'intro',
  match_result JSONB,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cami_session_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session history"
  ON public.cami_session_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session history"
  ON public.cami_session_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session history"
  ON public.cami_session_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_cami_session_history_user ON public.cami_session_history (user_id, session_date DESC);
