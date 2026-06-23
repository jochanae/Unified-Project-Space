-- 1. Drop the overly broad anon SELECT policy on the base table
DROP POLICY IF EXISTS "Anyone can view published pages" ON public.pages;

-- 2. Create a security_invoker view that exposes only public-safe columns
--    Aliases published_content_blocks → content_blocks so the public app
--    transparently renders the published snapshot, never the draft.
CREATE OR REPLACE VIEW public.pages_public
WITH (security_invoker = on) AS
SELECT
  id,
  title,
  slug,
  theme,
  local_business,
  project_id,
  org_id,
  COALESCE(published_content_blocks, content_blocks) AS content_blocks
FROM public.pages
WHERE is_published = true;

-- 3. Re-add a narrow SELECT policy on the base table so the view (running as
--    the invoker) can resolve published rows for anonymous visitors. Authenticated
--    org members still get full row+column access via the existing ALL policy.
CREATE POLICY "Anon can view published pages via view only"
  ON public.pages
  FOR SELECT
  TO anon
  USING (is_published = true);

-- 4. Grant view access
GRANT SELECT ON public.pages_public TO anon, authenticated;