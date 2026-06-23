INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload project assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = get_user_org_id()::text
);

CREATE POLICY "Users can view project assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = get_user_org_id()::text
);

CREATE POLICY "Public can view project assets"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'project-assets');

CREATE POLICY "Users can delete project assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = get_user_org_id()::text
);