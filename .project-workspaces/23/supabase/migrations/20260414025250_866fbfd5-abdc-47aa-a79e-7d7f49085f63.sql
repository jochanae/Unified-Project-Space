
ALTER TABLE public.projects
  ADD COLUMN custom_domain text,
  ADD COLUMN domain_verified boolean DEFAULT false;
