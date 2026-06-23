ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_user_tags
  ON public.knowledge_documents USING GIN(tags)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_vault_index
  ON public.knowledge_documents(user_id, updated_at DESC)
  WHERE is_active = true;