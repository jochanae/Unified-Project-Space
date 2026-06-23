-- Table for caching companion-generated media (stickers, selfies, activity scenes)
CREATE TABLE public.companion_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'sticker' | 'selfie' | 'activity'
  image_url TEXT NOT NULL,
  caption TEXT,
  prompt TEXT, -- the expression/activity used to generate
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companion_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own media"
ON public.companion_media FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media"
ON public.companion_media FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
ON public.companion_media FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_companion_media_user_type ON public.companion_media (user_id, member_id, media_type);