-- 1) Tighten ab_tests anonymous exposure: stop leaking org_id.
DROP POLICY IF EXISTS "Anyone can view active ab tests" ON public.ab_tests;

CREATE OR REPLACE VIEW public.ab_tests_public
WITH (security_invoker = true)
AS
SELECT id, page_id, field_name, variant_a, variant_b
FROM public.ab_tests
WHERE is_active = true;

GRANT SELECT ON public.ab_tests_public TO anon, authenticated;

-- Re-allow authenticated org members on the base table (org policy already covers them).
-- Anonymous published pages will read from the view instead.

-- 2) Make project-assets bucket private. Avatars + marketing-assets stay public per user choice.
UPDATE storage.buckets SET public = false WHERE id = 'project-assets';

-- RLS policies for project-assets: org members can read/write their own folder; anon cannot read.
-- File path convention used by uploaders is `${orgId}/...` — enforce via first folder.
DROP POLICY IF EXISTS "Org members can read project-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload project-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update project-assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete project-assets" ON storage.objects;

CREATE POLICY "Org members can read project-assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);

CREATE POLICY "Org members can upload project-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);

CREATE POLICY "Org members can update project-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);

CREATE POLICY "Org members can delete project-assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-assets'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);