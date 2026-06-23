
CREATE TABLE public.lead_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID,
  page_id UUID,
  contact_id UUID,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'public_form',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_notifications_org_created ON public.lead_notifications(org_id, created_at DESC);

ALTER TABLE public.lead_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org lead notifications"
ON public.lead_notifications
FOR ALL
TO authenticated
USING (org_id = get_user_org_id())
WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Anon can insert lead notifications via public forms"
ON public.lead_notifications
FOR INSERT
TO anon
WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notifications;
ALTER TABLE public.lead_notifications REPLICA IDENTITY FULL;
