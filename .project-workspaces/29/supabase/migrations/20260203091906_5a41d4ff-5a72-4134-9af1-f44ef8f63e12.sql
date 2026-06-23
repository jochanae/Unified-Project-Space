-- Add RLS policies for cms-images storage bucket
-- Allow authenticated users to upload only to their own avatar folder
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cms-images' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cms-images' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cms-images' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow public read access for all images in cms-images bucket
CREATE POLICY "Public read access for cms-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cms-images');

-- Allow admins to manage all files in cms-images bucket
CREATE POLICY "Admins can manage all cms-images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'cms-images' AND
  public.is_admin(auth.uid())
);
