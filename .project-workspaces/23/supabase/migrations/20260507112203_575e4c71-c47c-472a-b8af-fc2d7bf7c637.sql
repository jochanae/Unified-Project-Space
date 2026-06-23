
ALTER TABLE public.email_sequences
  ADD COLUMN IF NOT EXISTS behavior_trigger text,
  ADD COLUMN IF NOT EXISTS behavior_target_page_id uuid,
  ADD COLUMN IF NOT EXISTS behavior_threshold_hours integer;

COMMENT ON COLUMN public.email_sequences.behavior_trigger IS
  'Optional behavior trigger: viewed_no_convert | no_email_engagement | abandoned_checkout';

CREATE TABLE IF NOT EXISTS public.queued_behavior_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  sequence_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  behavior_trigger text NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, contact_id, behavior_trigger)
);

ALTER TABLE public.queued_behavior_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their behavior log"
  ON public.queued_behavior_log
  FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Service role manages behavior log"
  ON public.queued_behavior_log
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_queued_behavior_log_org ON public.queued_behavior_log(org_id, queued_at DESC);
