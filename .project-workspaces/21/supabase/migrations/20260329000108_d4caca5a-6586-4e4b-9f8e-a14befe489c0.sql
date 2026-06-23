ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_city text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_hub_city text DEFAULT NULL;