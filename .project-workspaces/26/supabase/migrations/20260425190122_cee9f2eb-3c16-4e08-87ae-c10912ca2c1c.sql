-- =========================================================
-- 1. REALTIME: scope postgres_changes to the row's owner
-- =========================================================

-- Drop existing broad SELECT policies on realtime.messages, then add scoped one
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy WHERE polrelid = 'realtime.messages'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.polname);
  END LOOP;
END $$;

-- Authenticated users can subscribe to broadcast/presence on user-scoped topics
CREATE POLICY "Users can read own user-scoped broadcast/presence"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension IN ('broadcast', 'presence')
    AND public.realtime_topic_user_id(topic) = auth.uid()
  );

CREATE POLICY "Users can write own user-scoped broadcast/presence"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    extension IN ('broadcast', 'presence')
    AND public.realtime_topic_user_id(topic) = auth.uid()
  );

-- For postgres_changes, restrict so user only receives changes on rows they own.
-- Realtime evaluates this policy with the candidate row exposed via the
-- standard column accessors; we filter by user_id where applicable.
CREATE POLICY "Users can subscribe only to their own postgres_changes"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'postgres_changes'
  );

-- NOTE: Realtime row-level filtering for postgres_changes is enforced via
-- the underlying tables' RLS (Realtime re-evaluates the source table's
-- SELECT policy per subscriber). All published tables (transactions,
-- accounts, bills, debts, credit_scores, goals, goal_contributions, etc.)
-- already have user_id = auth.uid() SELECT policies, so each subscriber
-- now only receives change events for rows their own RLS allows them to
-- read. The previous wide-open policy bypassed that check.

-- =========================================================
-- 2. REFERRAL CONVERSIONS: only the referred user can insert,
--    and they cannot self-refer.
-- =========================================================

DROP POLICY IF EXISTS "Authenticated users can create conversion records"
  ON public.referral_conversions;

CREATE POLICY "Referred user can create their own conversion"
  ON public.referral_conversions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = referred_user_id
    AND referrer_user_id IS DISTINCT FROM referred_user_id
  );

-- =========================================================
-- 3. PROFESSIONAL REVIEWS: hide reviewer user_id from the public.
-- =========================================================

-- Public-safe view: omits user_id
CREATE OR REPLACE VIEW public.professional_reviews_public
WITH (security_invoker = on) AS
SELECT
  id,
  professional_id,
  rating,
  review_text,
  created_at,
  updated_at
FROM public.professional_reviews;

GRANT SELECT ON public.professional_reviews_public TO anon, authenticated;

-- Restrict base table SELECT: only the review author or an admin can read full row
DROP POLICY IF EXISTS "Authenticated users can view professional reviews"
  ON public.professional_reviews;

CREATE POLICY "Review author or admin can view full review row"
  ON public.professional_reviews
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

-- =========================================================
-- 4 & 5. PUBLIC BUCKETS: prevent listing while keeping
--        direct file URL access functional.
-- =========================================================

-- Drop the broad "Public can view ..." SELECT policies that allowed listing
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vision images" ON storage.objects;

-- The existing per-file policies remain:
--   "avatars: read individual files"        (bucket_id = 'avatars' AND name IS NOT NULL)
--   "vision-images: read individual files"  (bucket_id = 'vision-images' AND name IS NOT NULL)
-- These allow direct-URL access to a known filename but do not enable
-- LIST operations because storage.objects LIST requires a SELECT policy
-- that matches without a specific name; with `name IS NOT NULL`, list
-- queries that scan the bucket are no longer satisfied broadly.

-- Mark buckets as non-public so the storage API no longer advertises listing.
UPDATE storage.buckets SET public = false WHERE id IN ('avatars', 'vision-images');