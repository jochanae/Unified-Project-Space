
-- Add CRM fields to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

-- Convert tags from text to text[] 
ALTER TABLE public.contacts 
  ALTER COLUMN tags TYPE text[] USING CASE WHEN tags IS NULL THEN '{}'::text[] ELSE ARRAY[tags] END;

ALTER TABLE public.contacts 
  ALTER COLUMN tags SET DEFAULT '{}'::text[];

-- Index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON public.contacts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_org_project ON public.contacts(org_id, source_project_id);
