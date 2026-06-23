-- Fix: Restrict circle-handouts uploads to circle owners only
DROP POLICY IF EXISTS "Authenticated users can upload handouts" ON storage.objects;

CREATE POLICY "Circle owners can upload handouts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'circle-handouts'
    AND public.is_circle_owner(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );