
-- Add avatar_url to connections for created companions
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add member_avatar_url to companion_feed_posts for cross-user display
ALTER TABLE public.companion_feed_posts
  ADD COLUMN IF NOT EXISTS member_avatar_url text;
