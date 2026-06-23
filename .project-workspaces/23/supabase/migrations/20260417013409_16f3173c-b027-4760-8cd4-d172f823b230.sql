CREATE TABLE public.blueprint_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  project_id UUID,
  project_name TEXT,
  blueprint_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'export',
  version_label TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blueprint_versions_org_project ON public.blueprint_versions(org_id, project_id, created_at DESC);

ALTER TABLE public.blueprint_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their blueprint versions"
ON public.blueprint_versions FOR SELECT
TO authenticated
USING (org_id = get_user_org_id());

CREATE POLICY "Org members can create blueprint versions"
ON public.blueprint_versions FOR INSERT
TO authenticated
WITH CHECK (org_id = get_user_org_id() AND (created_by = auth.uid() OR created_by IS NULL));

CREATE POLICY "Org members can delete their blueprint versions"
ON public.blueprint_versions FOR DELETE
TO authenticated
USING (org_id = get_user_org_id());