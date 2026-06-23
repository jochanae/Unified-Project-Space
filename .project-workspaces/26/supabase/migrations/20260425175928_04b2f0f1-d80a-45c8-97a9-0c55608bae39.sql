-- ============================================================
-- QUINN VAULT — multi-image uploads + metadata
-- ============================================================

-- 1. Private storage bucket (per-user folders)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quinn-vault', 'quinn-vault', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies — owner-scoped path enforcement
CREATE POLICY "Users can read own vault files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'quinn-vault' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own vault files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quinn-vault' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own vault files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'quinn-vault' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'quinn-vault' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own vault files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'quinn-vault' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. Vault items table — metadata for each upload
CREATE TABLE public.vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_path text NOT NULL,        -- e.g. <uid>/<timestamp>-<filename>
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  title text,
  notes text,
  tags text[] DEFAULT '{}'::text[],
  project_id text,                   -- soft link to Quinn project (localStorage id)
  conversation_id uuid,              -- optional link to Quinn chat
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vault_items_user_id_idx ON public.vault_items(user_id, created_at DESC);
CREATE INDEX vault_items_project_idx ON public.vault_items(user_id, project_id);

ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vault items"
ON public.vault_items FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own vault items"
ON public.vault_items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own vault items"
ON public.vault_items FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own vault items"
ON public.vault_items FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER vault_items_updated_at
BEFORE UPDATE ON public.vault_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();