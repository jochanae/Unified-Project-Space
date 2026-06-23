-- Sermons table: top-level sermon record per user
CREATE TABLE public.sermons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Sermon',
  theme text,
  scripture_ref text,
  scripture_text text,
  audience text,
  tone text,
  length_target text DEFAULT 'standard',
  outline jsonb,
  manuscript text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  current_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sermons" ON public.sermons
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sermons" ON public.sermons
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sermons" ON public.sermons
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sermons" ON public.sermons
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_sermons_user_updated ON public.sermons(user_id, updated_at DESC);

CREATE TRIGGER set_sermons_updated_at
  BEFORE UPDATE ON public.sermons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sermon versions: immutable revision history
CREATE TABLE public.sermon_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_id uuid NOT NULL REFERENCES public.sermons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version_number integer NOT NULL,
  outline jsonb,
  manuscript text NOT NULL DEFAULT '',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sermon_id, version_number)
);

ALTER TABLE public.sermon_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sermon versions" ON public.sermon_versions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sermon versions" ON public.sermon_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sermon versions" ON public.sermon_versions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_sermon_versions_sermon ON public.sermon_versions(sermon_id, version_number DESC);