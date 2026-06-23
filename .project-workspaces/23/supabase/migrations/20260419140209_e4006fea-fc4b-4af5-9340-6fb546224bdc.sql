-- 1. Create funnels table
CREATE TABLE public.funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Funnel',
  funnel_type TEXT NOT NULL DEFAULT 'lead_gen',
  status TEXT NOT NULL DEFAULT 'draft',
  slug TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnels_project_id ON public.funnels(project_id);
CREATE INDEX idx_funnels_org_id ON public.funnels(org_id);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org funnels"
ON public.funnels
FOR ALL
TO authenticated
USING (org_id = public.get_user_org_id())
WITH CHECK (org_id = public.get_user_org_id());

CREATE TRIGGER update_funnels_updated_at
BEFORE UPDATE ON public.funnels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add funnel_id to pages
ALTER TABLE public.pages
ADD COLUMN funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL;

CREATE INDEX idx_pages_funnel_id ON public.pages(funnel_id);

-- 3. Backfill: one default funnel per project, assign all existing pages
DO $$
DECLARE
  _project RECORD;
  _new_funnel_id UUID;
BEGIN
  FOR _project IN SELECT id, org_id, name FROM public.projects LOOP
    INSERT INTO public.funnels (project_id, org_id, name, funnel_type, status)
    VALUES (_project.id, _project.org_id, 'Main Funnel', 'lead_gen', 'draft')
    RETURNING id INTO _new_funnel_id;

    UPDATE public.pages
    SET funnel_id = _new_funnel_id
    WHERE project_id = _project.id AND funnel_id IS NULL;
  END LOOP;
END $$;