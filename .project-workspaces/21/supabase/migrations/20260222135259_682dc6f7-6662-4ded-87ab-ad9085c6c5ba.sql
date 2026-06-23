-- Add source type and image_url to favorites for chat/milestone/match moments
ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'feed',
  ADD COLUMN IF NOT EXISTS image_url text;

-- Add a comment for clarity
COMMENT ON COLUMN public.favorites.source IS 'Source type: feed, chat, milestone, match';
COMMENT ON COLUMN public.favorites.image_url IS 'Optional image URL for companion selfies or match avatars';