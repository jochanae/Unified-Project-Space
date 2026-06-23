-- Sermon scripture pins (one row per pinned passage)
CREATE TABLE public.sermon_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sermon_id uuid NOT NULL REFERENCES public.sermons(id) ON DELETE CASCADE,
  scripture_ref text NOT NULL,
  book text NOT NULL,
  chapter integer NOT NULL,
  verse_start integer,
  verse_end integer,
  version text NOT NULL DEFAULT 'KJV',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sermon_pins_sermon_idx ON public.sermon_pins (sermon_id, position);
CREATE INDEX sermon_pins_user_idx ON public.sermon_pins (user_id);

ALTER TABLE public.sermon_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sermon pins" ON public.sermon_pins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sermon pins" ON public.sermon_pins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sermon pins" ON public.sermon_pins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sermon pins" ON public.sermon_pins
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- One scratchpad per sermon
CREATE TABLE public.sermon_scratchpads (
  sermon_id uuid PRIMARY KEY REFERENCES public.sermons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sermon_scratchpads_user_idx ON public.sermon_scratchpads (user_id);

ALTER TABLE public.sermon_scratchpads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sermon scratchpad" ON public.sermon_scratchpads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sermon scratchpad" ON public.sermon_scratchpads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sermon scratchpad" ON public.sermon_scratchpads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sermon scratchpad" ON public.sermon_scratchpads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER sermon_scratchpads_updated_at
  BEFORE UPDATE ON public.sermon_scratchpads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();