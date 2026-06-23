
ALTER TABLE public.knowledge_documents 
  ADD COLUMN IF NOT EXISTS effective_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS version_label text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS supersedes_id uuid DEFAULT NULL REFERENCES public.knowledge_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delta_summary text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
