CREATE TABLE IF NOT EXISTS public.funnel_affiliates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id       UUID        REFERENCES public.projects(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  email            TEXT,
  ref_code         TEXT        NOT NULL UNIQUE,
  commission_type  TEXT        NOT NULL DEFAULT 'percentage'
                               CHECK (commission_type IN ('percentage', 'flat_cents')),
  commission_value INTEGER     NOT NULL DEFAULT 30,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'paused')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_affiliates_org     ON public.funnel_affiliates (org_id);
CREATE INDEX IF NOT EXISTS idx_funnel_affiliates_project ON public.funnel_affiliates (project_id);
CREATE INDEX IF NOT EXISTS idx_funnel_affiliates_code    ON public.funnel_affiliates (ref_code);

ALTER TABLE public.funnel_affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their affiliates"
  ON public.funnel_affiliates FOR ALL TO authenticated
  USING  (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL,
  affiliate_id     UUID        NOT NULL REFERENCES public.funnel_affiliates(id) ON DELETE CASCADE,
  contact_id       UUID        REFERENCES public.contacts(id) ON DELETE SET NULL,
  order_id         UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  event_type       TEXT        NOT NULL CHECK (event_type IN ('lead', 'purchase')),
  amount_cents     INTEGER     NOT NULL DEFAULT 0,
  commission_cents INTEGER     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'paid')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_conv_affiliate ON public.affiliate_conversions (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_conv_contact   ON public.affiliate_conversions (contact_id);
CREATE INDEX IF NOT EXISTS idx_aff_conv_order     ON public.affiliate_conversions (order_id);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their conversions"
  ON public.affiliate_conversions FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "Service role manages conversions"
  ON public.affiliate_conversions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS affiliate_id UUID
    REFERENCES public.funnel_affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_affiliate ON public.contacts (affiliate_id)
  WHERE affiliate_id IS NOT NULL;