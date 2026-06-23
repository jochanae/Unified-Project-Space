CREATE OR REPLACE VIEW public.pages_public AS
SELECT
  p.id,
  p.title,
  p.slug,
  p.theme,
  p.local_business,
  p.project_id,
  p.org_id,
  COALESCE(p.published_content_blocks, p.content_blocks) AS content_blocks,
  p.next_page_id,
  np.slug AS next_slug
FROM public.pages p
LEFT JOIN public.pages np ON np.id = p.next_page_id AND np.is_published = true
WHERE p.is_published = true;