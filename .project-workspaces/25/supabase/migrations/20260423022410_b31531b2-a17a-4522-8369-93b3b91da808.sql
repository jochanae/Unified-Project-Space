CREATE TABLE public.reader_resume_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('shown', 'accepted', 'undo')),
  book text,
  chapter integer,
  verse integer,
  version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reader_resume_events_created_at_idx ON public.reader_resume_events (created_at DESC);
CREATE INDEX reader_resume_events_user_id_idx ON public.reader_resume_events (user_id);
CREATE INDEX reader_resume_events_event_type_idx ON public.reader_resume_events (event_type);

ALTER TABLE public.reader_resume_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own resume events"
  ON public.reader_resume_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own resume events"
  ON public.reader_resume_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all resume events"
  ON public.reader_resume_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));