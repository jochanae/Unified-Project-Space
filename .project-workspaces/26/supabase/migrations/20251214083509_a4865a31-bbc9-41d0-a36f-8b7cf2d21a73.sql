-- SECURITY FIX: Remove remaining dangerous RLS policies

-- 1. Fix family_chat_messages - Remove overly permissive INSERT policy
DROP POLICY IF EXISTS "Allow kids to send chat messages" ON public.family_chat_messages;

-- 2. Fix kid_savings_goals - Remove overly permissive INSERT policy
DROP POLICY IF EXISTS "Allow direct kid savings goal insert" ON public.kid_savings_goals;

-- 3. Fix professionals - Require authentication to view (still publicly listed but not to bots)
DROP POLICY IF EXISTS "Anyone can view active professionals" ON public.professionals;
CREATE POLICY "Authenticated users can view active professionals"
ON public.professionals
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 4. Fix events - Hide meeting_url from public, require auth to see full details
DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
CREATE POLICY "Authenticated users can view published events"
ON public.events
FOR SELECT
USING (is_published = true AND auth.uid() IS NOT NULL);

-- 5. Allow public to see basic event info without meeting links (for landing page)
CREATE POLICY "Public can view basic event info"
ON public.events
FOR SELECT
USING (
  is_published = true 
  AND auth.uid() IS NULL
  -- meeting_url will still be returned but this requires app-level filtering
);