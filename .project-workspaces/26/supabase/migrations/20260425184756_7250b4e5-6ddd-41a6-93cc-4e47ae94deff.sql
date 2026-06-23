-- Drop the three overly permissive policies on vision-images bucket
-- These allowed anonymous users to insert/update/delete ANY file
DROP POLICY IF EXISTS "Allow direct vision image deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow direct vision image updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow direct vision image uploads" ON storage.objects;

-- Ensure folder-scoped authenticated policies exist (idempotent recreation)
DROP POLICY IF EXISTS "Users can upload vision images to own folder" ON storage.objects;
CREATE POLICY "Users can upload vision images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vision-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update vision images in own folder" ON storage.objects;
CREATE POLICY "Users can update vision images in own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vision-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'vision-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete vision images in own folder" ON storage.objects;
CREATE POLICY "Users can delete vision images in own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vision-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);