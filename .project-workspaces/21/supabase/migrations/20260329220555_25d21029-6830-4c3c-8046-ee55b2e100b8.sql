-- Remove overly permissive public read policies
DROP POLICY IF EXISTS "Chat images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public audio read" ON storage.objects;

-- Replace with owner-scoped read policies
CREATE POLICY "Users can read own chat images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own audio messages"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'audio-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );