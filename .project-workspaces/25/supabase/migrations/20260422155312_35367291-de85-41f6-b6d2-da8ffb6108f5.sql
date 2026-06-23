-- Vault Collections (organization layer)
CREATE TABLE public.vault_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Study',
  description TEXT,
  master_thought TEXT,
  color TEXT NOT NULL DEFAULT 'gold',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vault_collections_user ON public.vault_collections(user_id, archived, updated_at DESC);

ALTER TABLE public.vault_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vault collections"
  ON public.vault_collections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own vault collections"
  ON public.vault_collections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own vault collections"
  ON public.vault_collections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own vault collections"
  ON public.vault_collections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER vault_collections_set_updated_at
  BEFORE UPDATE ON public.vault_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vault Items (verses, notes, quotes inside a collection)
CREATE TABLE public.vault_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID NOT NULL REFERENCES public.vault_collections(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'verse',
  book TEXT,
  chapter INTEGER,
  verse_start INTEGER,
  verse_end INTEGER,
  version TEXT DEFAULT 'KJV',
  scripture_ref TEXT,
  quote_text TEXT,
  note_text TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vault_items_collection ON public.vault_items(collection_id, position);
CREATE INDEX idx_vault_items_user ON public.vault_items(user_id, created_at DESC);

ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vault items"
  ON public.vault_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own vault items"
  ON public.vault_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own vault items"
  ON public.vault_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own vault items"
  ON public.vault_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER vault_items_set_updated_at
  BEFORE UPDATE ON public.vault_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();