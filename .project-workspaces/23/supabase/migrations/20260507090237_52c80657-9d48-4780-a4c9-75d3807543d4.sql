ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS country     text,
  ADD COLUMN IF NOT EXISTS city        text,
  ADD COLUMN IF NOT EXISTS region      text,
  ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE public.landing_signal_leads
  ADD COLUMN IF NOT EXISTS country     text,
  ADD COLUMN IF NOT EXISTS city        text,
  ADD COLUMN IF NOT EXISTS region      text,
  ADD COLUMN IF NOT EXISTS postal_code text;

CREATE INDEX IF NOT EXISTS idx_contacts_postal_code ON public.contacts (postal_code)
  WHERE postal_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_postal_won ON public.contacts (postal_code, pipeline_stage)
  WHERE postal_code IS NOT NULL;