-- Poem template enum
DO $$ BEGIN
  CREATE TYPE public.poem_template AS ENUM ('heart_cry', 'psalm', 'proverb');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Poems table
CREATE TABLE IF NOT EXISTS public.poems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template public.poem_template NOT NULL DEFAULT 'heart_cry',
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  praise TEXT NOT NULL DEFAULT '',
  anchor TEXT NOT NULL DEFAULT '',
  line TEXT NOT NULL DEFAULT '',
  inspiration TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  deep_dive JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS poems_user_updated_idx
  ON public.poems (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS poems_tags_idx
  ON public.poems USING GIN (tags);

ALTER TABLE public.poems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own poems"
  ON public.poems FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own poems"
  ON public.poems FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own poems"
  ON public.poems FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own poems"
  ON public.poems FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger reuses existing public.set_updated_at()
DROP TRIGGER IF EXISTS poems_set_updated_at ON public.poems;
CREATE TRIGGER poems_set_updated_at
  BEFORE UPDATE ON public.poems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- One-time backfill from notes(note_type='poem'). Body text is preserved into
-- the heart_cry "body" field as a safe default — users can re-template later.
INSERT INTO public.poems (user_id, template, body, inspiration, created_at, updated_at)
SELECT user_id, 'heart_cry'::public.poem_template, COALESCE(body_text, ''),
       scripture_ref, created_at, updated_at
FROM public.notes
WHERE note_type = 'poem'
  AND NOT EXISTS (
    SELECT 1 FROM public.poems p
    WHERE p.user_id = notes.user_id
      AND p.created_at = notes.created_at
  );
