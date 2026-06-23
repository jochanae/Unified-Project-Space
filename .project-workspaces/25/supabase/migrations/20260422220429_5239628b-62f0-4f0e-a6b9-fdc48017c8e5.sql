-- Study Circuit sessions: persist the active "Scripture Playlist" per user
-- so they can resume their place from any device.
CREATE TABLE public.study_circuit_sessions (
  user_id uuid NOT NULL PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.vault_collections(id) ON DELETE CASCADE,
  collection_title text NOT NULL,
  collection_color text NOT NULL DEFAULT 'gold',
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_index integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.study_circuit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own circuit session"
  ON public.study_circuit_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own circuit session"
  ON public.study_circuit_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own circuit session"
  ON public.study_circuit_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own circuit session"
  ON public.study_circuit_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_study_circuit_sessions_updated_at
  BEFORE UPDATE ON public.study_circuit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();