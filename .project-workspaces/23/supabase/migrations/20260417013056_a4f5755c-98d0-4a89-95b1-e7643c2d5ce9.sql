-- Scheduled follow-ups table: queue Quinn-drafted emails to send later
CREATE TABLE public.scheduled_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  scheduled_by UUID NOT NULL,
  lead_notification_id UUID,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed | canceled
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_followups_due
  ON public.scheduled_followups (send_at)
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_followups_org
  ON public.scheduled_followups (org_id, status, send_at DESC);

ALTER TABLE public.scheduled_followups ENABLE ROW LEVEL SECURITY;

-- Org members can view, create, update (cancel/reschedule), or delete their own scheduled follow-ups
CREATE POLICY "Org members can view scheduled followups"
  ON public.scheduled_followups FOR SELECT
  TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "Org members can create scheduled followups"
  ON public.scheduled_followups FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_user_org_id() AND scheduled_by = auth.uid());

CREATE POLICY "Org members can update their scheduled followups"
  ON public.scheduled_followups FOR UPDATE
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Org members can delete their scheduled followups"
  ON public.scheduled_followups FOR DELETE
  TO authenticated
  USING (org_id = get_user_org_id());

-- Service role full access (for the cron processor)
CREATE POLICY "Service role full access scheduled followups"
  ON public.scheduled_followups FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_scheduled_followups_updated_at
BEFORE UPDATE ON public.scheduled_followups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();