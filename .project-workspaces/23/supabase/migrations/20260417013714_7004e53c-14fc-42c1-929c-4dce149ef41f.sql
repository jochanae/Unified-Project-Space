ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_local_business jsonb;