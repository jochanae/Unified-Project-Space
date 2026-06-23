
-- ============================================================
-- 1. Create private kid-avatars bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kid-avatars',
  'kid-avatars',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Helper: who can access a kid avatar file (path is `{kid_id}/...`)
CREATE OR REPLACE FUNCTION public.can_access_kid_avatar(p_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kid_id uuid;
BEGIN
  -- First path segment must be a valid uuid (kid profile id)
  BEGIN
    v_kid_id := (storage.foldername(p_path))[1]::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- Allow: the kid themselves, a linked parent, or an admin
  RETURN
    public.is_own_kid_profile(v_kid_id)
    OR public.is_parent_of_kid(v_kid_id, auth.uid())
    OR public.is_admin(auth.uid());
END;
$$;

-- RLS policies on storage.objects for kid-avatars
DROP POLICY IF EXISTS "kid_avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "kid_avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "kid_avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "kid_avatars_delete" ON storage.objects;

CREATE POLICY "kid_avatars_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kid-avatars'
  AND public.can_access_kid_avatar(name)
);

CREATE POLICY "kid_avatars_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kid-avatars'
  AND public.can_access_kid_avatar(name)
);

CREATE POLICY "kid_avatars_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kid-avatars'
  AND public.can_access_kid_avatar(name)
);

CREATE POLICY "kid_avatars_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kid-avatars'
  AND public.can_access_kid_avatar(name)
);

-- ============================================================
-- 2. Mask Stripe IDs on partners table
-- ============================================================
-- Revoke column-level read access for these sensitive columns from
-- regular roles. Service role (used by edge functions) is unaffected.
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.partners FROM anon, authenticated, PUBLIC;

-- Re-grant SELECT on all OTHER columns to authenticated so existing
-- queries (select *) work for non-sensitive fields. Postgres requires
-- an explicit column list when revoking specific columns.
GRANT SELECT (
  id, name, slug, logo_url, primary_color, secondary_color,
  custom_domain, subscription_status, seats_purchased, seats_used,
  owner_user_id, contact_email, hero_title, hero_description,
  is_active, created_at, updated_at, tagline, contact_info,
  highlights_text, external_website_url, office_name, phone, address,
  contact_logo_url, design_theme, branding_level, show_name_with_logo
) ON public.partners TO authenticated;

-- Owner-only secure accessor for the masked Stripe fields
CREATE OR REPLACE FUNCTION public.get_partner_stripe_ids(p_partner_id uuid)
RETURNS TABLE(stripe_customer_id text, stripe_subscription_id text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.partners WHERE id = p_partner_id AND owner_user_id = auth.uid())
    OR public.is_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT p.stripe_customer_id, p.stripe_subscription_id
    FROM public.partners p
    WHERE p.id = p_partner_id;
END;
$$;
