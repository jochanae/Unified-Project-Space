-- Quinn Studio Video drafts (Phase 1: script + voice preview)
CREATE TABLE public.studio_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID,
  created_by UUID,
  title TEXT NOT NULL DEFAULT 'Untitled Video',
  template TEXT NOT NULL DEFAULT 'chalkboard_explainer',
  phase INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  script TEXT NOT NULL DEFAULT '',
  voice_id TEXT,
  voice_name TEXT,
  audio_preview_url TEXT,
  audio_storage_path TEXT,
  duration_seconds NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their studio videos"
ON public.studio_videos
FOR ALL
TO authenticated
USING (org_id = get_user_org_id())
WITH CHECK (org_id = get_user_org_id());

CREATE INDEX idx_studio_videos_org ON public.studio_videos(org_id, created_at DESC);
CREATE INDEX idx_studio_videos_project ON public.studio_videos(project_id);

CREATE TRIGGER trg_studio_videos_updated_at
BEFORE UPDATE ON public.studio_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for audio previews in project-assets bucket
CREATE POLICY "Org members can upload studio audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = 'studio-audio'
);

CREATE POLICY "Org members can read studio audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = 'studio-audio'
);

CREATE POLICY "Org members can delete their studio audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = 'studio-audio'
);