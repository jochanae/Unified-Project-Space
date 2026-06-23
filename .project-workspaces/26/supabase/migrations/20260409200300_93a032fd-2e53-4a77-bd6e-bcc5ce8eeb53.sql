
CREATE OR REPLACE VIEW public.partners_public AS
SELECT
  id,
  name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  hero_title,
  hero_description,
  tagline,
  is_active,
  office_name,
  external_website_url,
  design_theme,
  branding_level,
  show_name_with_logo,
  phone,
  address,
  contact_logo_url,
  contact_info,
  highlights_text
FROM public.partners
WHERE is_active = true;
