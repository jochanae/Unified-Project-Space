-- Fix recalculate_budget_spent to use correct column name (transaction_date)
CREATE OR REPLACE FUNCTION public.recalculate_budget_spent(p_budget_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget record;
  v_total_spent numeric;
BEGIN
  -- Get budget info
  SELECT id, user_id, category, start_date INTO v_budget 
  FROM budgets WHERE id = p_budget_id;
  
  IF v_budget IS NULL THEN RETURN; END IF;
  
  -- Calculate spent from transactions table for this user/category
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM transactions
  WHERE user_id = v_budget.user_id
    AND type = 'expense'
    AND map_transaction_to_budget_category(category, type) = (SELECT category FROM budgets WHERE id = p_budget_id)
    AND transaction_date >= v_budget.start_date
    AND transaction_date < v_budget.start_date + interval '1 month';
  
  -- Add any budget_transactions
  SELECT v_total_spent + COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM budget_transactions
  WHERE budget_id = p_budget_id;
  
  -- Update budget spent
  UPDATE budgets SET spent = v_total_spent, updated_at = now() 
  WHERE id = p_budget_id;
END;
$$;

-- Fix sync_transaction_to_budget to use correct column name
CREATE OR REPLACE FUNCTION public.sync_transaction_to_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget_category budget_category;
  v_budget_id uuid;
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.type = 'expense' THEN
      v_budget_category := map_transaction_to_budget_category(NEW.category, NEW.type);
      
      IF v_budget_category IS NOT NULL THEN
        -- Find matching active budget
        SELECT id INTO v_budget_id
        FROM budgets
        WHERE user_id = NEW.user_id
          AND category = v_budget_category
          AND is_active = true
          AND NEW.transaction_date >= start_date
        ORDER BY start_date DESC
        LIMIT 1;
        
        IF v_budget_id IS NOT NULL THEN
          PERFORM recalculate_budget_spent(v_budget_id);
        END IF;
      END IF;
    END IF;
    
    -- For UPDATE, also check old values if category changed
    IF TG_OP = 'UPDATE' AND OLD.category != NEW.category THEN
      v_budget_category := map_transaction_to_budget_category(OLD.category, OLD.type);
      IF v_budget_category IS NOT NULL THEN
        SELECT id INTO v_budget_id
        FROM budgets
        WHERE user_id = OLD.user_id
          AND category = v_budget_category
          AND is_active = true
        LIMIT 1;
        
        IF v_budget_id IS NOT NULL THEN
          PERFORM recalculate_budget_spent(v_budget_id);
        END IF;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.type = 'expense' THEN
      v_budget_category := map_transaction_to_budget_category(OLD.category, OLD.type);
      
      IF v_budget_category IS NOT NULL THEN
        SELECT id INTO v_budget_id
        FROM budgets
        WHERE user_id = OLD.user_id
          AND category = v_budget_category
          AND is_active = true
        LIMIT 1;
        
        IF v_budget_id IS NOT NULL THEN
          PERFORM recalculate_budget_spent(v_budget_id);
        END IF;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;