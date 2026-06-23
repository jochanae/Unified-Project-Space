-- Add parent_id for threaded comment replies
ALTER TABLE public.post_comments ADD COLUMN parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Index for efficient child lookups
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_id);
