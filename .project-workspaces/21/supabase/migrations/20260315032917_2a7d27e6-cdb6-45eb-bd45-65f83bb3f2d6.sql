
ALTER TABLE public.companion_feed_posts
  ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'reflection',
  ADD COLUMN IF NOT EXISTS event_label text,
  ADD COLUMN IF NOT EXISTS companion_reactions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS event_type text;
