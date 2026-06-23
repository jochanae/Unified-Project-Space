-- Create storage bucket for user-uploaded chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true);

-- Allow authenticated users to upload their own chat images
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view chat images (they're public for rendering)
CREATE POLICY "Chat images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Users can delete their own chat images
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);