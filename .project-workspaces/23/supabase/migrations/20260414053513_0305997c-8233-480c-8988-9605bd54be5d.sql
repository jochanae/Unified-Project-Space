
CREATE POLICY "Users can update their own org project assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  )
  WITH CHECK (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );
