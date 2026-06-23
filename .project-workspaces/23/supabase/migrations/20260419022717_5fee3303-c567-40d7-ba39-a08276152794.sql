-- Render Jobs scaffold (Lambda-ready)
CREATE TABLE IF NOT EXISTS public.render_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  video_id UUID NOT NULL,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'stub',
  output_url TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_org_status ON public.render_jobs (org_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_render_jobs_video ON public.render_jobs (video_id, created_at DESC);

ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their render jobs"
ON public.render_jobs
FOR ALL
TO authenticated
USING (org_id = public.get_user_org_id())
WITH CHECK (org_id = public.get_user_org_id());

-- Auto-update updated_at
CREATE TRIGGER trg_render_jobs_updated_at
BEFORE UPDATE ON public.render_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime so dashboard can subscribe to progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.render_jobs;
ALTER TABLE public.render_jobs REPLICA IDENTITY FULL;