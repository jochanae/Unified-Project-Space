DROP VIEW IF EXISTS public.virtual_gifts_public;

CREATE VIEW public.virtual_gifts_public AS
SELECT
  id,
  name,
  description,
  category,
  image_url,
  price_cents,
  is_active,
  created_at,
  mature_only
FROM public.virtual_gifts;