-- =========================================================
-- 1. PROFESSIONALS: deny anon, restrict to authenticated paths
-- =========================================================

-- Drop the legacy unrestricted policies that applied to {public} role
DROP POLICY IF EXISTS "Professionals can view their linked profile" ON public.professionals;
DROP POLICY IF EXISTS "Professionals can update their linked profile" ON public.professionals;
DROP POLICY IF EXISTS "Partner owners can manage their professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;

-- Re-create the same access scoped to authenticated only
CREATE POLICY "Professionals can view their linked profile"
  ON public.professionals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Professionals can update their linked profile"
  ON public.professionals
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Partner owners can manage their professionals"
  ON public.professionals
  FOR ALL
  TO authenticated
  USING (
    partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = professionals.partner_id AND p.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = professionals.partner_id AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage professionals"
  ON public.professionals
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 2. EVENTS: remove anon access; add safe public view
-- =========================================================

DROP POLICY IF EXISTS "Public can view basic event info" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view published events" ON public.events;

CREATE POLICY "Authenticated users can view published events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Public-safe view: omits meeting_url and other private fields
CREATE OR REPLACE VIEW public.events_public
WITH (security_invoker = on) AS
SELECT
  id,
  title,
  description,
  event_type,
  start_time,
  end_time,
  is_published,
  partner_id,
  created_at,
  updated_at
FROM public.events
WHERE is_published = true;

GRANT SELECT ON public.events_public TO anon, authenticated;

-- =========================================================
-- 3. KIDS_PROFILES: parent path through family_links + safe view
-- =========================================================

-- Replace the parent SELECT policy so it goes through the verified family link,
-- not just user_id = auth.uid(). The kid's own access stays intact.
DROP POLICY IF EXISTS "Parents can view linked kids non-credential fields"
  ON public.kids_profiles;

CREATE POLICY "Parents can view linked kids via family_links"
  ON public.kids_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_parent_of_kid(id, auth.uid()));

-- Note: full credential fields (pin_hash, security_answer_hash, security_answer,
-- security_question) on the base table remain visible only to the kid themself
-- (via "Kids can view own profile" using user_id = auth.uid()) and to admins via
-- existing admin policies. Parents must use parent_update_kid_profile() and
-- get_kid_profile_for_parent() RPCs which already mask credentials.

-- =========================================================
-- 4. STORAGE: remove anonymous role from per-file SELECT policies
-- =========================================================

DROP POLICY IF EXISTS "avatars: read individual files" ON storage.objects;
DROP POLICY IF EXISTS "vision-images: read individual files" ON storage.objects;

CREATE POLICY "avatars: authenticated read individual files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND name IS NOT NULL);

CREATE POLICY "vision-images: authenticated read individual files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'vision-images' AND name IS NOT NULL);

-- =========================================================
-- 5. USER_ROLES & RATE_LIMITS: explicit anon deny for clarity
-- =========================================================

CREATE POLICY "Deny anonymous access to user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anonymous access to rate_limits"
  ON public.rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);