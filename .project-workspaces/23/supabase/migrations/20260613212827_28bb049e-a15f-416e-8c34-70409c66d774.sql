
-- ============================================================
-- campaign_sequences: a saved timeline of scheduled assets
-- ============================================================
CREATE TABLE public.campaign_sequences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  project_id  uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by  uuid NOT NULL DEFAULT auth.uid(),
  name        text NOT NULL DEFAULT 'Untitled Campaign',
  status      text NOT NULL DEFAULT 'draft', -- draft | active | paused | archived
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_sequences TO authenticated;
GRANT ALL ON public.campaign_sequences TO service_role;

ALTER TABLE public.campaign_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their campaign sequences"
  ON public.campaign_sequences FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Org members can create campaign sequences"
  ON public.campaign_sequences FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id() AND created_by = auth.uid());

CREATE POLICY "Org members can update their campaign sequences"
  ON public.campaign_sequences FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Org members can delete their campaign sequences"
  ON public.campaign_sequences FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE TRIGGER trg_campaign_sequences_updated_at
  BEFORE UPDATE ON public.campaign_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_campaign_sequences_org    ON public.campaign_sequences(org_id);
CREATE INDEX idx_campaign_sequences_proj   ON public.campaign_sequences(project_id);


-- ============================================================
-- campaign_sequence_steps: ordered cards inside a sequence
-- ============================================================
CREATE TABLE public.campaign_sequence_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id    uuid NOT NULL REFERENCES public.campaign_sequences(id) ON DELETE CASCADE,
  org_id         uuid NOT NULL,
  position       integer NOT NULL DEFAULT 0,
  title          text NOT NULL DEFAULT 'Untitled Step',
  format         text NOT NULL DEFAULT 'flyer', -- flyer | social | logo | hero | freeform
  asset_id       uuid REFERENCES public.marketing_assets(id) ON DELETE SET NULL,
  asset_url      text,
  -- schedule
  schedule_kind  text NOT NULL DEFAULT 'delay' CHECK (schedule_kind IN ('delay','calendar')),
  delay_days     integer,                   -- used when kind = 'delay'
  calendar_day   text,                      -- Mon..Sun, used when kind = 'calendar'
  calendar_time  text,                      -- HH:MM 24h, used when kind = 'calendar'
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_sequence_steps TO authenticated;
GRANT ALL ON public.campaign_sequence_steps TO service_role;

ALTER TABLE public.campaign_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their sequence steps"
  ON public.campaign_sequence_steps FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Org members can insert sequence steps"
  ON public.campaign_sequence_steps FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Org members can update sequence steps"
  ON public.campaign_sequence_steps FOR UPDATE TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Org members can delete sequence steps"
  ON public.campaign_sequence_steps FOR DELETE TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE TRIGGER trg_campaign_sequence_steps_updated_at
  BEFORE UPDATE ON public.campaign_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_campaign_steps_sequence ON public.campaign_sequence_steps(sequence_id, position);
CREATE INDEX idx_campaign_steps_org      ON public.campaign_sequence_steps(org_id);


-- ============================================================
-- Validation trigger for schedule integrity (use trigger, not CHECK,
-- so the rule stays mutable and safe across edits).
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_campaign_step_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.schedule_kind = 'delay' THEN
    IF NEW.delay_days IS NULL OR NEW.delay_days < 0 OR NEW.delay_days > 365 THEN
      RAISE EXCEPTION 'delay_days must be between 0 and 365 when schedule_kind=delay';
    END IF;
    NEW.calendar_day  := NULL;
    NEW.calendar_time := NULL;
  ELSIF NEW.schedule_kind = 'calendar' THEN
    IF NEW.calendar_day IS NULL OR NEW.calendar_day NOT IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun') THEN
      RAISE EXCEPTION 'calendar_day must be one of Mon..Sun when schedule_kind=calendar';
    END IF;
    IF NEW.calendar_time IS NULL OR NEW.calendar_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
      RAISE EXCEPTION 'calendar_time must be HH:MM (24h) when schedule_kind=calendar';
    END IF;
    NEW.delay_days := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_campaign_step_schedule
  BEFORE INSERT OR UPDATE ON public.campaign_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.validate_campaign_step_schedule();
