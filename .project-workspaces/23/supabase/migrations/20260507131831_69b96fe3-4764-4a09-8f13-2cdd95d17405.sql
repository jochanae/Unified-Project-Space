CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id          UUID        REFERENCES public.projects(id) ON DELETE CASCADE,
  url                 TEXT        NOT NULL,
  secret              TEXT        NOT NULL,
  events              TEXT[]      NOT NULL DEFAULT ARRAY['lead.created'],
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_triggered_at   TIMESTAMPTZ,
  last_status_code    INTEGER
);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org webhooks" ON public.webhook_endpoints;
CREATE POLICY "Users manage their org webhooks"
  ON public.webhook_endpoints FOR ALL TO authenticated
  USING  (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org ON public.webhook_endpoints (org_id)
  WHERE is_active = true;