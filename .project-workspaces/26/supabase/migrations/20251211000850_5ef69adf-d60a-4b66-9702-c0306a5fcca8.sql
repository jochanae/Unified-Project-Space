-- Create trigger for month-end auto-contribution from budgets to goals
CREATE OR REPLACE FUNCTION public.process_budget_auto_contribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_budget numeric;
  contribution_amount numeric;
BEGIN
  -- Only process if budget has a linked goal and auto_contribute is enabled
  IF OLD.linked_goal_id IS NOT NULL AND OLD.auto_contribute = true THEN
    -- Calculate remaining budget
    remaining_budget := OLD.amount - OLD.spent;
    
    -- Only contribute if there's remaining budget
    IF remaining_budget > 0 THEN
      -- Calculate contribution based on percent
      contribution_amount := remaining_budget * (OLD.contribution_percent / 100);
      
      IF contribution_amount > 0 THEN
        -- Update the goal's current_amount
        UPDATE public.goals 
        SET current_amount = current_amount + contribution_amount,
            updated_at = now()
        WHERE id = OLD.linked_goal_id;
        
        -- Create a goal contribution record
        INSERT INTO public.goal_contributions (goal_id, user_id, amount, notes, is_approved)
        VALUES (
          OLD.linked_goal_id, 
          OLD.user_id, 
          contribution_amount, 
          'Auto-contribution from budget: ' || OLD.name || ' (Month-end)',
          true
        );
        
        -- Create activity record
        INSERT INTO public.goal_activity (goal_id, user_id, activity_type, description, metadata)
        VALUES (
          OLD.linked_goal_id,
          OLD.user_id,
          'contribution',
          'Auto-contribution of $' || contribution_amount || ' from budget: ' || OLD.name,
          jsonb_build_object('amount', contribution_amount, 'budget_id', OLD.id, 'budget_name', OLD.name)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger that fires when budget is_active changes to false (budget period ends)
CREATE TRIGGER trigger_budget_auto_contribution
  BEFORE UPDATE OF is_active ON public.budgets
  FOR EACH ROW
  WHEN (OLD.is_active = true AND NEW.is_active = false)
  EXECUTE FUNCTION public.process_budget_auto_contribution();

-- Also create a function that can be called manually or by a cron job for month-end processing
CREATE OR REPLACE FUNCTION public.process_monthly_budget_contributions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget_record RECORD;
  remaining_budget numeric;
  contribution_amount numeric;
BEGIN
  -- Find all active budgets with linked goals and auto_contribute enabled
  -- that are from the previous month
  FOR budget_record IN 
    SELECT * FROM public.budgets 
    WHERE is_active = true 
      AND linked_goal_id IS NOT NULL 
      AND auto_contribute = true
      AND start_date < date_trunc('month', CURRENT_DATE)
  LOOP
    -- Calculate remaining budget
    remaining_budget := budget_record.amount - budget_record.spent;
    
    -- Only contribute if there's remaining budget
    IF remaining_budget > 0 THEN
      -- Calculate contribution based on percent
      contribution_amount := remaining_budget * (budget_record.contribution_percent / 100);
      
      IF contribution_amount > 0 THEN
        -- Update the goal's current_amount
        UPDATE public.goals 
        SET current_amount = current_amount + contribution_amount,
            updated_at = now()
        WHERE id = budget_record.linked_goal_id;
        
        -- Create a goal contribution record
        INSERT INTO public.goal_contributions (goal_id, user_id, amount, notes, is_approved)
        VALUES (
          budget_record.linked_goal_id, 
          budget_record.user_id, 
          contribution_amount, 
          'Auto-contribution from budget: ' || budget_record.name || ' (Month-end)',
          true
        );
        
        -- Mark budget as processed by setting is_active to false
        UPDATE public.budgets SET is_active = false WHERE id = budget_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;