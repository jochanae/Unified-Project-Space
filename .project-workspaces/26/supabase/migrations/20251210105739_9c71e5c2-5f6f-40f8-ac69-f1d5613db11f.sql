-- Create goal types enum
CREATE TYPE public.goal_type AS ENUM ('individual', 'joint', 'family', 'friends', 'business', 'community');

-- Create goal collaborator role enum
CREATE TYPE public.collaborator_role AS ENUM ('owner', 'organizer', 'contributor', 'viewer');

-- Create invitation status enum
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  goal_type public.goal_type NOT NULL DEFAULT 'individual',
  deadline DATE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal collaborators table
CREATE TABLE public.goal_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.collaborator_role NOT NULL DEFAULT 'contributor',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(goal_id, user_id)
);

-- Goal contributions table
CREATE TABLE public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal comments table
CREATE TABLE public.goal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.goal_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal activity table
CREATE TABLE public.goal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal invitations table
CREATE TABLE public.goal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.collaborator_role NOT NULL DEFAULT 'contributor',
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_invitations ENABLE ROW LEVEL SECURITY;

-- Function to check if user is goal collaborator
CREATE OR REPLACE FUNCTION public.is_goal_collaborator(goal_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.goal_collaborators
    WHERE goal_collaborators.goal_id = $1 AND goal_collaborators.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = $1 AND goals.user_id = $2
  )
$$;

-- Function to check if user is goal owner or organizer
CREATE OR REPLACE FUNCTION public.is_goal_admin(goal_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = $1 AND goals.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM public.goal_collaborators
    WHERE goal_collaborators.goal_id = $1 
      AND goal_collaborators.user_id = $2 
      AND goal_collaborators.role IN ('owner', 'organizer')
  )
$$;

-- Goals policies
CREATE POLICY "Users can view their own goals"
ON public.goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view goals they collaborate on"
ON public.goals FOR SELECT
USING (public.is_goal_collaborator(id, auth.uid()));

CREATE POLICY "Users can create their own goals"
ON public.goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Goal owners can update their goals"
ON public.goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Goal owners can delete their goals"
ON public.goals FOR DELETE
USING (auth.uid() = user_id);

-- Goal collaborators policies
CREATE POLICY "Collaborators can view goal collaborators"
ON public.goal_collaborators FOR SELECT
USING (public.is_goal_collaborator(goal_id, auth.uid()));

CREATE POLICY "Goal admins can add collaborators"
ON public.goal_collaborators FOR INSERT
WITH CHECK (public.is_goal_admin(goal_id, auth.uid()));

CREATE POLICY "Goal admins can remove collaborators"
ON public.goal_collaborators FOR DELETE
USING (public.is_goal_admin(goal_id, auth.uid()));

-- Goal contributions policies
CREATE POLICY "Collaborators can view contributions"
ON public.goal_contributions FOR SELECT
USING (public.is_goal_collaborator(goal_id, auth.uid()));

CREATE POLICY "Collaborators can add contributions"
ON public.goal_contributions FOR INSERT
WITH CHECK (public.is_goal_collaborator(goal_id, auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Goal admins can update contributions"
ON public.goal_contributions FOR UPDATE
USING (public.is_goal_admin(goal_id, auth.uid()));

-- Goal comments policies
CREATE POLICY "Collaborators can view comments"
ON public.goal_comments FOR SELECT
USING (public.is_goal_collaborator(goal_id, auth.uid()));

CREATE POLICY "Collaborators can add comments"
ON public.goal_comments FOR INSERT
WITH CHECK (public.is_goal_collaborator(goal_id, auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.goal_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.goal_comments FOR DELETE
USING (auth.uid() = user_id OR public.is_goal_admin(goal_id, auth.uid()));

-- Goal activity policies
CREATE POLICY "Collaborators can view activity"
ON public.goal_activity FOR SELECT
USING (public.is_goal_collaborator(goal_id, auth.uid()));

CREATE POLICY "System can insert activity"
ON public.goal_activity FOR INSERT
WITH CHECK (public.is_goal_collaborator(goal_id, auth.uid()));

-- Goal invitations policies
CREATE POLICY "Goal admins can view invitations"
ON public.goal_invitations FOR SELECT
USING (public.is_goal_admin(goal_id, auth.uid()));

CREATE POLICY "Goal admins can create invitations"
ON public.goal_invitations FOR INSERT
WITH CHECK (public.is_goal_admin(goal_id, auth.uid()));

CREATE POLICY "Goal admins can update invitations"
ON public.goal_invitations FOR UPDATE
USING (public.is_goal_admin(goal_id, auth.uid()));

-- Create updated_at triggers
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goal_comments_updated_at
BEFORE UPDATE ON public.goal_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for goals
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_activity;