
CREATE TABLE public.bundle_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deployed_by UUID NOT NULL,
  bundle_type TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  caption TEXT,
  tracked_link TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bundle_deployments_org_created_idx ON public.bundle_deployments(org_id, created_at DESC);
GRANT SELECT, INSERT ON public.bundle_deployments TO authenticated;
GRANT ALL ON public.bundle_deployments TO service_role;
ALTER TABLE public.bundle_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read bundle_deployments" ON public.bundle_deployments
  FOR SELECT TO authenticated USING (org_id = public.get_user_org_id());
CREATE POLICY "Org members insert bundle_deployments" ON public.bundle_deployments
  FOR INSERT TO authenticated WITH CHECK (org_id = public.get_user_org_id() AND deployed_by = auth.uid());
