DROP POLICY IF EXISTS "vision-images: authenticated read individual files" ON storage.objects;

CREATE POLICY "vision-images: owner reads own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vision-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );