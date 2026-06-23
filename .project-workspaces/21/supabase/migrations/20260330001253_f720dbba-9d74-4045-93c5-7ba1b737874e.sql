-- Drop the remaining permissive open-read policies
DROP POLICY IF EXISTS "Chat images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public audio read" ON storage.objects;