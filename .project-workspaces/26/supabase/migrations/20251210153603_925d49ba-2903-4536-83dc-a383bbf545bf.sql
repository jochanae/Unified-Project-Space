-- Create storage bucket for vision board images
INSERT INTO storage.buckets (id, name, public)
VALUES ('vision-images', 'vision-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload vision images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vision-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their vision images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vision-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their vision images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'vision-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access since bucket is public
CREATE POLICY "Public can view vision images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vision-images');