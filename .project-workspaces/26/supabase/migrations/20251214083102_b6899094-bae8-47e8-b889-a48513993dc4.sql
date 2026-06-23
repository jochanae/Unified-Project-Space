-- SECURITY FIX: Remove dangerous public RLS policies that expose family and children data

-- 1. Fix family_chat_messages - Remove policy that allows public viewing
DROP POLICY IF EXISTS "Allow kids to view chat messages" ON public.family_chat_messages;

-- 2. Fix family_links - Remove policy that allows public viewing  
DROP POLICY IF EXISTS "Allow kids to view family links" ON public.family_links;

-- Create proper policy for kids to view their own family links
CREATE POLICY "Kids can view their own family links"
ON public.family_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM kids_profiles
    WHERE kids_profiles.id = family_links.kid_profile_id
    AND kids_profiles.user_id = auth.uid()
  )
);

-- 3. Fix kid_savings_goals - Remove overly permissive policies
DROP POLICY IF EXISTS "Allow all to view savings goals" ON public.kid_savings_goals;
DROP POLICY IF EXISTS "Allow direct kid savings goal update" ON public.kid_savings_goals;
DROP POLICY IF EXISTS "Allow direct savings goal updates" ON public.kid_savings_goals;

-- 4. Fix professional_reviews - Make viewable by authenticated users only (not public)
DROP POLICY IF EXISTS "Anyone can view professional reviews" ON public.professional_reviews;

CREATE POLICY "Authenticated users can view professional reviews"
ON public.professional_reviews
FOR SELECT
USING (auth.uid() IS NOT NULL);