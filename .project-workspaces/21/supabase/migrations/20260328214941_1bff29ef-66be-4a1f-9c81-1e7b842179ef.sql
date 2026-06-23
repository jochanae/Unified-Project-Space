
-- Knowledge Vault: stores user-uploaded documents and manual text entries
CREATE TABLE public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content_text text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'manual',
  file_url text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge docs"
  ON public.knowledge_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge docs"
  ON public.knowledge_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge docs"
  ON public.knowledge_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge docs"
  ON public.knowledge_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for knowledge vault PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-vault', 'knowledge-vault', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'knowledge-vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'knowledge-vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'knowledge-vault' AND (storage.foldername(name))[1] = auth.uid()::text);
