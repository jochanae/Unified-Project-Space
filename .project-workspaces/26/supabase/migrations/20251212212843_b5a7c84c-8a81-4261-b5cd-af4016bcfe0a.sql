-- =====================================================
-- FAMILY GROUPS SYSTEM - Multi-parent, Group Chat, Shared Chores
-- =====================================================

-- Create family_groups table (represents a household)
CREATE TABLE public.family_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  max_kids INTEGER NOT NULL DEFAULT 2,
  invite_code TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(8), 'hex'),
  group_message_count INTEGER NOT NULL DEFAULT 0,
  group_message_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Create family_group_members table (links parents and kids to groups)
CREATE TABLE public.family_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID, -- For parents (nullable, but one of user_id or kid_profile_id must be set)
  kid_profile_id UUID REFERENCES public.kids_profiles(id) ON DELETE CASCADE, -- For kids
  member_type TEXT NOT NULL CHECK (member_type IN ('parent', 'kid')),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('primary', 'secondary', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT one_identity CHECK (
    (user_id IS NOT NULL AND kid_profile_id IS NULL) OR 
    (user_id IS NULL AND kid_profile_id IS NOT NULL)
  ),
  CONSTRAINT unique_user_per_group UNIQUE (family_group_id, user_id),
  CONSTRAINT unique_kid_per_group UNIQUE (family_group_id, kid_profile_id)
);

-- Enable RLS
ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;

-- Create group_chat_messages table
CREATE TABLE public.group_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('parent', 'kid')),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'chore_update', 'allowance_update', 'celebration', 'system')),
  related_chore_id UUID REFERENCES public.kid_chores(id) ON DELETE SET NULL,
  sticker_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is a family group member
CREATE OR REPLACE FUNCTION public.is_family_group_member(group_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_group_members
    WHERE family_group_id = group_id 
      AND (
        user_id = check_user_id 
        OR kid_profile_id IN (
          SELECT id FROM public.kids_profiles WHERE user_id = check_user_id
        )
      )
  )
$$;

-- Check if user is a family group admin (primary/secondary parent)
CREATE OR REPLACE FUNCTION public.is_family_group_admin(group_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_group_members
    WHERE family_group_id = group_id 
      AND user_id = check_user_id
      AND member_type = 'parent'
      AND role IN ('primary', 'secondary')
  )
$$;

-- Check if group can send messages (premium or under limit)
CREATE OR REPLACE FUNCTION public.can_send_group_message(group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_groups
    WHERE id = group_id 
      AND (
        subscription_tier = 'premium' 
        OR group_message_count < group_message_limit
      )
  )
$$;

-- Increment group message count
CREATE OR REPLACE FUNCTION public.increment_group_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.family_groups 
  SET group_message_count = group_message_count + 1
  WHERE id = NEW.family_group_id;
  RETURN NEW;
END;
$$;

-- Create trigger for message count
CREATE TRIGGER increment_message_count_trigger
AFTER INSERT ON public.group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.increment_group_message_count();

-- =====================================================
-- RLS POLICIES - family_groups
-- =====================================================

CREATE POLICY "Users can create groups"
ON public.family_groups
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group members can view their groups"
ON public.family_groups
FOR SELECT
USING (is_family_group_member(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Group admins can update their groups"
ON public.family_groups
FOR UPDATE
USING (is_family_group_admin(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Group creators can delete their groups"
ON public.family_groups
FOR DELETE
USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES - family_group_members
-- =====================================================

CREATE POLICY "Group admins can add members"
ON public.family_group_members
FOR INSERT
WITH CHECK (
  is_family_group_admin(family_group_id, auth.uid()) 
  OR user_id = auth.uid()
  OR kid_profile_id IN (SELECT id FROM public.kids_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Members can view other members"
ON public.family_group_members
FOR SELECT
USING (is_family_group_member(family_group_id, auth.uid()));

CREATE POLICY "Group admins can update members"
ON public.family_group_members
FOR UPDATE
USING (is_family_group_admin(family_group_id, auth.uid()));

CREATE POLICY "Group admins can remove members"
ON public.family_group_members
FOR DELETE
USING (is_family_group_admin(family_group_id, auth.uid()) OR user_id = auth.uid());

-- =====================================================
-- RLS POLICIES - group_chat_messages
-- =====================================================

CREATE POLICY "Members can view group messages"
ON public.group_chat_messages
FOR SELECT
USING (is_family_group_member(family_group_id, auth.uid()));

CREATE POLICY "Members can send group messages if allowed"
ON public.group_chat_messages
FOR INSERT
WITH CHECK (
  is_family_group_member(family_group_id, auth.uid()) 
  AND can_send_group_message(family_group_id)
);

-- =====================================================
-- EXTEND EXISTING TABLES
-- =====================================================

-- Add group visibility to kid_chores for shared chore board
ALTER TABLE public.kid_chores ADD COLUMN IF NOT EXISTS is_group_visible BOOLEAN NOT NULL DEFAULT false;

-- Add family_group_id to kid_chores for associating chores with a family group
ALTER TABLE public.kid_chores ADD COLUMN IF NOT EXISTS family_group_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL;

-- Add updated_at trigger for family_groups
CREATE TRIGGER update_family_groups_updated_at
BEFORE UPDATE ON public.family_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for group chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;