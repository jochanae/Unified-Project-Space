
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS from_phone text;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_unsubscribed_at timestamptz;

ALTER TABLE public.email_sequences
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';
ALTER TABLE public.email_sequences ALTER COLUMN subject DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.email_sequences ADD CONSTRAINT email_sequences_channel_chk CHECK (channel IN ('email','sms'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.scheduled_followups
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS recipient_phone text;
ALTER TABLE public.scheduled_followups ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE public.scheduled_followups ALTER COLUMN recipient_email DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.scheduled_followups ADD CONSTRAINT scheduled_followups_channel_chk CHECK (channel IN ('email','sms'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.lead_followups
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS recipient_phone text;
ALTER TABLE public.lead_followups ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE public.lead_followups ALTER COLUMN recipient_email DROP NOT NULL;

UPDATE public.organizations SET from_phone='+12298006715' WHERE id='05b89559-fa95-46f0-9874-e9ac43c2ed48' AND from_phone IS NULL;
