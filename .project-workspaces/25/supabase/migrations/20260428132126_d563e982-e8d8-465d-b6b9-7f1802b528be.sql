-- 1. Avatar mode on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_mode text NOT NULL DEFAULT 'default';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_mode_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_mode_check
  CHECK (avatar_mode IN ('upload', 'default', 'none'));

-- 2. Video metadata on board_items
ALTER TABLE public.board_items
  ADD COLUMN IF NOT EXISTS video_provider text,
  ADD COLUMN IF NOT EXISTS video_id text;

ALTER TABLE public.board_items
  DROP CONSTRAINT IF EXISTS board_items_video_provider_check;
ALTER TABLE public.board_items
  ADD CONSTRAINT board_items_video_provider_check
  CHECK (video_provider IS NULL OR video_provider IN ('youtube', 'vimeo'));

-- 3. Storage bucket for board media (avatars + item thumbnails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-media', 'board-media', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS: public read, owner-only write within own folder
DROP POLICY IF EXISTS "Board media is publicly readable" ON storage.objects;
CREATE POLICY "Board media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'board-media');

DROP POLICY IF EXISTS "Owners upload to own board-media folder" ON storage.objects;
CREATE POLICY "Owners upload to own board-media folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'board-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owners update own board-media files" ON storage.objects;
CREATE POLICY "Owners update own board-media files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'board-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'board-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owners delete own board-media files" ON storage.objects;
CREATE POLICY "Owners delete own board-media files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'board-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);