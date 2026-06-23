-- Reader position: cross-device "where I last was" sync.
-- One row per user (latest position). Local-first: client writes localStorage instantly,
-- then upserts here in the background. On load, client compares updated_at and adopts
-- whichever is newer.

CREATE TABLE public.reader_positions (
  user_id UUID NOT NULL PRIMARY KEY,
  book TEXT NOT NULL,
  book_index INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER,
  version TEXT NOT NULL DEFAULT 'KJV',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reader_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reader position"
  ON public.reader_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reader position"
  ON public.reader_positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reader position"
  ON public.reader_positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reader position"
  ON public.reader_positions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER reader_positions_set_updated_at
  BEFORE UPDATE ON public.reader_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();