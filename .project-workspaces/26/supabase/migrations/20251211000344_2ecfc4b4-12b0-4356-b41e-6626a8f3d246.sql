-- Add linked_goal_id to budgets table for linking to savings goals
ALTER TABLE public.budgets 
ADD COLUMN linked_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
ADD COLUMN auto_contribute boolean NOT NULL DEFAULT false,
ADD COLUMN contribution_percent numeric NOT NULL DEFAULT 100;

-- Create budget_collaborators table for collaborative budgets
CREATE TABLE public.budget_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (budget_id, user_id)
);

-- Enable RLS on budget_collaborators
ALTER TABLE public.budget_collaborators ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check budget collaboration
CREATE OR REPLACE FUNCTION public.is_budget_collaborator(budget_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_collaborators
    WHERE budget_collaborators.budget_id = $1 AND budget_collaborators.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = $1 AND budgets.user_id = $2
  )
$$;

-- Create function to check if user is budget admin (owner or editor)
CREATE OR REPLACE FUNCTION public.is_budget_admin(budget_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = $1 AND budgets.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM public.budget_collaborators
    WHERE budget_collaborators.budget_id = $1 
      AND budget_collaborators.user_id = $2 
      AND budget_collaborators.role IN ('owner', 'editor')
  )
$$;

-- RLS policies for budget_collaborators
CREATE POLICY "Users can view collaborators on budgets they collaborate on"
ON public.budget_collaborators FOR SELECT
USING (is_budget_collaborator(budget_id, auth.uid()));

CREATE POLICY "Budget admins can add collaborators"
ON public.budget_collaborators FOR INSERT
WITH CHECK (is_budget_admin(budget_id, auth.uid()));

CREATE POLICY "Budget admins can remove collaborators"
ON public.budget_collaborators FOR DELETE
USING (is_budget_admin(budget_id, auth.uid()));

-- Update budgets RLS to allow collaborators to view
CREATE POLICY "Users can view budgets they collaborate on"
ON public.budgets FOR SELECT
USING (is_budget_collaborator(id, auth.uid()));

-- Create goal_contributions trigger to auto-contribute from budget
CREATE OR REPLACE FUNCTION public.auto_contribute_budget_to_goal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_budget numeric;
  contribution_amount numeric;
  linked_goal record;
BEGIN
  -- Only process if budget has a linked goal and auto_contribute is enabled
  IF NEW.linked_goal_id IS NOT NULL AND NEW.auto_contribute = true THEN
    -- Calculate remaining budget
    remaining_budget := NEW.amount - NEW.spent;
    
    -- Only contribute if there's remaining budget
    IF remaining_budget > 0 THEN
      -- Calculate contribution based on percent
      contribution_amount := remaining_budget * (NEW.contribution_percent / 100);
      
      -- Get the linked goal
      SELECT * INTO linked_goal FROM public.goals WHERE id = NEW.linked_goal_id;
      
      IF linked_goal IS NOT NULL THEN
        -- Update the goal's current_amount
        UPDATE public.goals 
        SET current_amount = current_amount + contribution_amount,
            updated_at = now()
        WHERE id = NEW.linked_goal_id;
        
        -- Create a goal contribution record
        INSERT INTO public.goal_contributions (goal_id, user_id, amount, notes, is_approved)
        VALUES (
          NEW.linked_goal_id, 
          NEW.user_id, 
          contribution_amount, 
          'Auto-contribution from budget: ' || NEW.name,
          true
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create index for better performance
CREATE INDEX idx_budgets_linked_goal ON public.budgets(linked_goal_id);
CREATE INDEX idx_budget_collaborators_budget ON public.budget_collaborators(budget_id);
CREATE INDEX idx_budget_collaborators_user ON public.budget_collaborators(user_id);