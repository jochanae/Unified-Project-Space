
-- Add display info to circle_members so we can show names/avatars for guest participants
ALTER TABLE public.circle_members
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Allow members to update their own display info
CREATE POLICY "Members can update their own membership"
ON public.circle_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
