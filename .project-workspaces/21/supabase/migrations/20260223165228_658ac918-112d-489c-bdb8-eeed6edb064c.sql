
-- Fix infinite recursion: create security definer function for membership checks
CREATE OR REPLACE FUNCTION public.is_circle_member(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = _circle_id
      AND user_id = _user_id
  )
$$;

-- Drop and recreate policies using the function
DROP POLICY IF EXISTS "Members can view their circle's members" ON public.circle_members;
CREATE POLICY "Members can view their circle's members"
  ON public.circle_members FOR SELECT
  USING (public.is_circle_member(circle_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view circle messages" ON public.circle_messages;
CREATE POLICY "Members can view circle messages"
  ON public.circle_messages FOR SELECT
  USING (public.is_circle_member(circle_id, auth.uid()));

DROP POLICY IF EXISTS "Members can send circle messages" ON public.circle_messages;
CREATE POLICY "Members can send circle messages"
  ON public.circle_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_circle_member(circle_id, auth.uid())
  );

DROP POLICY IF EXISTS "Members can view their circles" ON public.custom_circles;
CREATE POLICY "Members can view their circles"
  ON public.custom_circles FOR SELECT
  USING (
    creator_id = auth.uid()
    OR public.is_circle_member(id, auth.uid())
  );
