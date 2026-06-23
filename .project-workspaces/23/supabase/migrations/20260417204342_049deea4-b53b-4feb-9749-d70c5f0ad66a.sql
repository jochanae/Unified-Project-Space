-- Drop the overly broad public SELECT policy
DROP POLICY IF EXISTS "Public can view marketing assets" ON storage.objects;

-- Allow org members to list/select files in their own org folder
CREATE POLICY "Org members can list their marketing assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );