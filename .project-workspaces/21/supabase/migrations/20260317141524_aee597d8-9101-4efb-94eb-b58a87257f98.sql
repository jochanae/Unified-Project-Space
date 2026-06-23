
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS page_type text DEFAULT 'blog',
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

-- Add a validation trigger instead of CHECK constraint for page_type
CREATE OR REPLACE FUNCTION public.validate_blog_page_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.page_type IS NOT NULL AND NEW.page_type NOT IN ('blog','story','feature','offer','announcement') THEN
    RAISE EXCEPTION 'Invalid page_type: %', NEW.page_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_blog_posts_page_type
BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_blog_page_type();
