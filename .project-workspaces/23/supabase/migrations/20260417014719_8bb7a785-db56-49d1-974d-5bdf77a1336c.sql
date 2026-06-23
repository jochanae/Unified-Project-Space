
-- Add engagement tracking columns to lead_followups
ALTER TABLE public.lead_followups
  ADD COLUMN IF NOT EXISTS tracking_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz,
  ADD COLUMN IF NOT EXISTS engagement_status text NOT NULL DEFAULT 'sent';

CREATE UNIQUE INDEX IF NOT EXISTS lead_followups_tracking_id_key
  ON public.lead_followups(tracking_id);

CREATE INDEX IF NOT EXISTS lead_followups_engagement_status_idx
  ON public.lead_followups(engagement_status);

-- Per-event log (one row per open/click event for diagnostics + admin view)
CREATE TABLE IF NOT EXISTS public.lead_followup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id uuid NOT NULL REFERENCES public.lead_followups(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('delivered','opened','clicked','bounced','complained')),
  url text,
  user_agent text,
  ip_hash text,
  source text NOT NULL DEFAULT 'pixel',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_followup_events_followup_idx
  ON public.lead_followup_events(followup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_followup_events_org_idx
  ON public.lead_followup_events(org_id, created_at DESC);

ALTER TABLE public.lead_followup_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their followup events"
  ON public.lead_followup_events FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Service role full access followup events"
  ON public.lead_followup_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
