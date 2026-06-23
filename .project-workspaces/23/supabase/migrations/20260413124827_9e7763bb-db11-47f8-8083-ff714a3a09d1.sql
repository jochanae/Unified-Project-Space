-- Make funnel_step_id nullable
ALTER TABLE public.pages ALTER COLUMN funnel_step_id DROP NOT NULL;

-- Add project_id column
ALTER TABLE public.pages ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add title column
ALTER TABLE public.pages ADD COLUMN title text NOT NULL DEFAULT '';

-- Index for project lookups
CREATE INDEX idx_pages_project_id ON public.pages(project_id);