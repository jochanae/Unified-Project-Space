CREATE TABLE public.competitor_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL,
  competitor_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  individual_audits JSONB NOT NULL DEFAULT '[]'::jsonb,
  aggregate_briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.competitor_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their competitor audits"
ON public.competitor_audits
FOR ALL
TO authenticated
USING (org_id = get_user_org_id())
WITH CHECK (org_id = get_user_org_id());

CREATE INDEX idx_competitor_audits_project ON public.competitor_audits(project_id);
CREATE INDEX idx_competitor_audits_org ON public.competitor_audits(org_id);

CREATE TRIGGER update_competitor_audits_updated_at
BEFORE UPDATE ON public.competitor_audits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();