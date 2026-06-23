-- Tighten studio audio storage policies to enforce org-level isolation
DROP POLICY IF EXISTS "Org members can read studio audio" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload studio audio" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete their studio audio" ON storage.objects;

CREATE POLICY "Org members can read studio audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = 'studio-audio'
  AND (storage.foldername(name))[2] = public.get_user_org_id()::text
);

CREATE POLICY "Org members can upload studio audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = 'studio-audio'
  AND (storage.foldername(name))[2] = public.get_user_org_id()::text
);

CREATE POLICY "Org members can delete their studio audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = 'studio-audio'
  AND (storage.foldername(name))[2] = public.get_user_org_id()::text
);