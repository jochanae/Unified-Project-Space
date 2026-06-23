ALTER TABLE public.social_campaigns
  ADD COLUMN IF NOT EXISTS created_page_id uuid REFERENCES public.pages(id) ON DELETE SET NULL;

ALTER TABLE public.email_sequences
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;
