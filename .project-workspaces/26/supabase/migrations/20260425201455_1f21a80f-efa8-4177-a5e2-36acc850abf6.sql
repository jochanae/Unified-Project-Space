-- Make the avatars bucket public so directory/family headshots load
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- Drop the overly permissive authenticated-read policy
DROP POLICY IF EXISTS "avatars: authenticated read individual files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars_bucket_public_read" ON storage.objects;

-- Public read for the avatars bucket (intentional: adult/professional headshots
-- are designed to be visible in directories and family views)
CREATE POLICY "avatars_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
