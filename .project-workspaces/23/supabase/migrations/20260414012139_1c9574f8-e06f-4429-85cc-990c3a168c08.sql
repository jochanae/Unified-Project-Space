
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  referrer text,
  user_agent text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their org page views"
ON public.page_views
FOR SELECT
TO authenticated
USING (org_id = get_user_org_id());

CREATE POLICY "Admins can view all page views"
ON public.page_views
FOR SELECT
TO authenticated
USING (is_admin());

CREATE INDEX idx_page_views_page_id ON public.page_views (page_id);
CREATE INDEX idx_page_views_org_id ON public.page_views (org_id);
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at);
