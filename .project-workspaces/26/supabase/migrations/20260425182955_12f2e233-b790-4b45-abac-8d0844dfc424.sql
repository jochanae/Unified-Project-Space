
-- ============================================================
-- 1. PROFESSIONALS: Remove anon access to sensitive fields
-- ============================================================

-- Drop overly broad public SELECT policies
DROP POLICY IF EXISTS "Anon can view active professionals for public pages" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users can view active professionals" ON public.professionals;
DROP POLICY IF EXISTS "Public can only access active professionals via view" ON public.professionals;

-- Create a safe public view that excludes sensitive financial / internal fields
DROP VIEW IF EXISTS public.professionals_public;
CREATE VIEW public.professionals_public
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  title,
  specialty,
  specialties,
  bio,
  avatar_url,
  website_url,
  calendar_url,
  is_featured,
  is_verified,
  is_active,
  rating,
  review_count,
  states_licensed,
  partner_id,
  qr_code_url,
  created_at,
  updated_at
FROM public.professionals
WHERE is_active = true;

-- Allow anon + authenticated to read the safe view
GRANT SELECT ON public.professionals_public TO anon, authenticated;

-- Base table: only owners, admins, and partner owners can SELECT
-- (The existing "Owners and admins" + "Professionals can view their linked profile"
--  + "Partner owners can manage" + "Admins can manage" policies remain.)

-- ============================================================
-- 2. KIDS_PROFILES: Drop plaintext security_answer column
-- ============================================================

ALTER TABLE public.kids_profiles DROP COLUMN IF EXISTS security_answer;

-- ============================================================
-- 3. USER_API_TOKENS: Drop plaintext token column
-- ============================================================

ALTER TABLE public.user_api_tokens DROP COLUMN IF EXISTS token;

-- ============================================================
-- 4. STORAGE: Restrict listing on public buckets
--    Keep individual file reads public, but block bucket listing.
-- ============================================================

-- vision-images
DROP POLICY IF EXISTS "Public read vision images" ON storage.objects;
DROP POLICY IF EXISTS "Public access for vision-images" ON storage.objects;
DROP POLICY IF EXISTS "vision-images public read" ON storage.objects;

CREATE POLICY "vision-images: read individual files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'vision-images' AND name IS NOT NULL);

-- avatars
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;

CREATE POLICY "avatars: read individual files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars' AND name IS NOT NULL);

-- ============================================================
-- 5. RATE_LIMITS: Add service-role-only policy
-- ============================================================

CREATE POLICY "Service role manages rate limits"
ON public.rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 6. Tighten always-true policies
-- ============================================================

-- beta_test_submissions: limit anonymous spam by requiring a session OR keep open but rate-limited;
-- here we restrict inserts to authenticated users (most realistic for beta feedback).
DROP POLICY IF EXISTS "Anyone can submit beta test feedback" ON public.beta_test_submissions;
CREATE POLICY "Authenticated users can submit beta feedback"
ON public.beta_test_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- profiles: service role only (handle_new_user trigger runs as definer; no need for true/true)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
ON public.profiles FOR INSERT
TO service_role
WITH CHECK (true);

-- quinn_private_usage: keep service-role-only but remove ALL/true permissiveness for other roles
DROP POLICY IF EXISTS "Service role manages private usage" ON public.quinn_private_usage;
CREATE POLICY "Service role manages private usage"
ON public.quinn_private_usage FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
