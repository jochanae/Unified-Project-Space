-- Budget invitations table (mirrors goal_invitations)
CREATE TABLE public.budget_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  invite_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget comments table (mirrors goal_comments)
CREATE TABLE public.budget_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.budget_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget activity table (mirrors goal_activity)
CREATE TABLE public.budget_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment methods table for goals and budgets
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'goal' or 'budget'
  entity_id UUID NOT NULL,
  method_type TEXT NOT NULL, -- 'venmo', 'paypal', 'zelle', 'cashapp', 'bank', 'other'
  display_name TEXT NOT NULL,
  details TEXT, -- username/handle/link
  instructions TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Budget invitations policies
CREATE POLICY "Budget admins can create invitations" ON public.budget_invitations
  FOR INSERT WITH CHECK (is_budget_admin(budget_id, auth.uid()));

CREATE POLICY "Budget admins can view invitations" ON public.budget_invitations
  FOR SELECT USING (is_budget_admin(budget_id, auth.uid()));

CREATE POLICY "Budget admins can update invitations" ON public.budget_invitations
  FOR UPDATE USING (is_budget_admin(budget_id, auth.uid()));

-- Budget comments policies
CREATE POLICY "Collaborators can view comments" ON public.budget_comments
  FOR SELECT USING (is_budget_collaborator(budget_id, auth.uid()));

CREATE POLICY "Collaborators can add comments" ON public.budget_comments
  FOR INSERT WITH CHECK (is_budget_collaborator(budget_id, auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.budget_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.budget_comments
  FOR DELETE USING (auth.uid() = user_id OR is_budget_admin(budget_id, auth.uid()));

-- Budget activity policies
CREATE POLICY "Collaborators can view activity" ON public.budget_activity
  FOR SELECT USING (is_budget_collaborator(budget_id, auth.uid()));

CREATE POLICY "System can insert activity" ON public.budget_activity
  FOR INSERT WITH CHECK (is_budget_collaborator(budget_id, auth.uid()));

-- Payment methods policies
CREATE POLICY "Users can view payment methods for entities they collaborate on" ON public.payment_methods
  FOR SELECT USING (
    (entity_type = 'goal' AND is_goal_collaborator(entity_id, auth.uid())) OR
    (entity_type = 'budget' AND is_budget_collaborator(entity_id, auth.uid()))
  );

CREATE POLICY "Entity owners can manage payment methods" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- Add trigger for updated_at on budget_comments
CREATE TRIGGER update_budget_comments_updated_at
  BEFORE UPDATE ON public.budget_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on payment_methods
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_activity;