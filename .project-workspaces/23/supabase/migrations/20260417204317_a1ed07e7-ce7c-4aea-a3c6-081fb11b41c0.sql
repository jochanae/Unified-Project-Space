-- 1. Add brand kit columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS studio_brand jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS brand_override jsonb DEFAULT NULL;

-- 2. marketing_assets table
CREATE TABLE IF NOT EXISTS public.marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid NULL,
  created_by uuid NULL,
  asset_type text NOT NULL DEFAULT 'social_tile', -- social_tile | flyer | story | qr | copy_deck
  template_id text NOT NULL DEFAULT 'obsidian-tile',
  title text NOT NULL DEFAULT 'Untitled Asset',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text NULL,
  storage_path text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_assets_org ON public.marketing_assets(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_project ON public.marketing_assets(project_id, created_at DESC);

ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org marketing assets"
  ON public.marketing_assets FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can create marketing assets in their org"
  ON public.marketing_assets FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id() AND (created_by = auth.uid() OR created_by IS NULL));

CREATE POLICY "Users can update their org marketing assets"
  ON public.marketing_assets FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Users can delete their org marketing assets"
  ON public.marketing_assets FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE TRIGGER trg_marketing_assets_updated_at
  BEFORE UPDATE ON public.marketing_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: org-folder convention -> first folder = org_id
CREATE POLICY "Public can view marketing assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-assets');

CREATE POLICY "Org members can upload marketing assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Org members can update their marketing assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Org members can delete their marketing assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );