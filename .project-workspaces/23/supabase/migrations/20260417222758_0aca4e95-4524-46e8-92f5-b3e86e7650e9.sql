-- Multi-brand kits
CREATE TABLE public.brand_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  created_by UUID,
  name TEXT NOT NULL DEFAULT 'Untitled Brand',
  is_default BOOLEAN NOT NULL DEFAULT false,
  kit JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their brand kits"
  ON public.brand_kits FOR ALL
  TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

CREATE TRIGGER trg_brand_kits_updated
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_brand_kits_org ON public.brand_kits(org_id);

-- Saved campaigns library (Quinn campaign memory)
CREATE TABLE public.saved_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID,
  created_by UUID,
  name TEXT NOT NULL DEFAULT 'Untitled Campaign',
  rationale TEXT,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their saved campaigns"
  ON public.saved_campaigns FOR ALL
  TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

CREATE TRIGGER trg_saved_campaigns_updated
  BEFORE UPDATE ON public.saved_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_campaigns_org ON public.saved_campaigns(org_id);
CREATE INDEX idx_saved_campaigns_project ON public.saved_campaigns(project_id);