-- Sermon research items: snippets, quotes, links pinned from Global Search or pasted manually
CREATE TABLE public.sermon_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_id uuid NOT NULL REFERENCES public.sermons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'snippet',          -- 'snippet' | 'quote' | 'link' | 'note'
  title text,
  body text NOT NULL DEFAULT '',
  source_url text,
  source_label text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX sermon_research_sermon_idx ON public.sermon_research (sermon_id, position, created_at);
CREATE INDEX sermon_research_user_idx ON public.sermon_research (user_id);

ALTER TABLE public.sermon_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sermon research"
  ON public.sermon_research FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sermon research"
  ON public.sermon_research FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sermon research"
  ON public.sermon_research FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own sermon research"
  ON public.sermon_research FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER sermon_research_set_updated_at
  BEFORE UPDATE ON public.sermon_research
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();