-- 1. Table
CREATE TABLE public.reader_position_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book text NOT NULL,
  book_index integer NOT NULL,
  chapter integer NOT NULL,
  verse integer,
  version text NOT NULL DEFAULT 'KJV',
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_reader_position_history_user_visited
  ON public.reader_position_history (user_id, visited_at DESC);

-- 2. RLS
ALTER TABLE public.reader_position_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own position history"
  ON public.reader_position_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own position history"
  ON public.reader_position_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own position history"
  ON public.reader_position_history
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Trim trigger — keep most recent 10 per user
CREATE OR REPLACE FUNCTION public.trim_reader_position_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.reader_position_history
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id
      FROM public.reader_position_history
      WHERE user_id = NEW.user_id
      ORDER BY visited_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trim_reader_position_history_after_insert
AFTER INSERT ON public.reader_position_history
FOR EACH ROW EXECUTE FUNCTION public.trim_reader_position_history();