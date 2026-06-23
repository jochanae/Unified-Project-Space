-- PresentQ deck handoff table: stores AI-generated slide JSON with a public share_token
CREATE TABLE public.presentq_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  page_id uuid REFERENCES public.pages(id) ON DELETE SET NULL,
  created_by uuid,
  share_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  title text NOT NULL DEFAULT 'Untitled Deck',
  source_url text,
  slide_count integer NOT NULL DEFAULT 7,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_presentq_decks_org ON public.presentq_decks(org_id);
CREATE INDEX idx_presentq_decks_project ON public.presentq_decks(project_id);
CREATE INDEX idx_presentq_decks_token ON public.presentq_decks(share_token);

ALTER TABLE public.presentq_decks ENABLE ROW LEVEL SECURITY;

-- Org members can read/manage their own decks
CREATE POLICY "Org members manage their decks"
  ON public.presentq_decks
  FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access decks"
  ON public.presentq_decks
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to keep updated_at fresh
CREATE TRIGGER trg_presentq_decks_updated_at
  BEFORE UPDATE ON public.presentq_decks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();