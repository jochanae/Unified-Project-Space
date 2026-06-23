
-- Create gift-images public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gift-images', 'gift-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read from the bucket (public)
CREATE POLICY "Anyone can read gift images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gift-images');

-- Allow service role to insert (edge function uses service role)
CREATE POLICY "Service role can upload gift images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'gift-images');

-- Allow service role to update/upsert
CREATE POLICY "Service role can update gift images"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'gift-images');
