
-- Add member metadata to companion_feed_posts so all users can see who posted
ALTER TABLE public.companion_feed_posts
  ADD COLUMN IF NOT EXISTS member_name text,
  ADD COLUMN IF NOT EXISTS member_handle text,
  ADD COLUMN IF NOT EXISTS member_personality text,
  ADD COLUMN IF NOT EXISTS member_bio text,
  ADD COLUMN IF NOT EXISTS member_age text,
  ADD COLUMN IF NOT EXISTS member_gender text;
