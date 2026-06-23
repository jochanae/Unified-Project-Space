-- Add permissive policy for kid sessions to upload vision images
CREATE POLICY "Allow direct vision image uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'vision-images');

-- Add permissive policy for updating vision images
CREATE POLICY "Allow direct vision image updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'vision-images');

-- Add permissive policy for deleting vision images
CREATE POLICY "Allow direct vision image deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'vision-images');