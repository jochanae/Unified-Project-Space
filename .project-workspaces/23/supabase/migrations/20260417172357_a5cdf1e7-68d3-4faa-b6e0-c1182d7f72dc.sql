-- Knowledge Vault: admin-managed library content with featured pinning and full-text search keywords
CREATE TABLE public.knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'topic', -- 'topic' | 'goal' | 'feature'
  topic TEXT NOT NULL DEFAULT 'General',
  skill_level TEXT NOT NULL DEFAULT 'beginner', -- 'beginner' | 'intermediate' | 'advanced'
  tags TEXT[] NOT NULL DEFAULT '{}',
  search_keywords TEXT NOT NULL DEFAULT '', -- comma-separated, indexed for global search
  feature_link TEXT,
  feature_link_label TEXT,
  read_minutes INTEGER NOT NULL DEFAULT 3,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_knowledge_items_published ON public.knowledge_items(is_published) WHERE is_published = true;
CREATE INDEX idx_knowledge_items_featured ON public.knowledge_items(is_featured) WHERE is_featured = true;
CREATE INDEX idx_knowledge_items_topic ON public.knowledge_items(topic);

ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read published items — global library
CREATE POLICY "Anyone can view published knowledge items"
  ON public.knowledge_items
  FOR SELECT
  USING (is_published = true);

-- Admins can do anything
CREATE POLICY "Admins can manage all knowledge items"
  ON public.knowledge_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- updated_at trigger using existing function
CREATE TRIGGER update_knowledge_items_updated_at
  BEFORE UPDATE ON public.knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();