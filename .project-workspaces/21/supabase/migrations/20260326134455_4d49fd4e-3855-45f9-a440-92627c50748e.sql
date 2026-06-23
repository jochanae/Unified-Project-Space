ALTER TABLE public.discovery_results ADD COLUMN IF NOT EXISTS secondary_key text DEFAULT NULL;
ALTER TABLE public.discovery_results ADD COLUMN IF NOT EXISTS secondary_label text DEFAULT NULL;