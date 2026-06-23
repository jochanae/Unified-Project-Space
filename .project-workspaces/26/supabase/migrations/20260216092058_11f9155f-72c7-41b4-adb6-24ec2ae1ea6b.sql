
-- Update the recalculate_budget_spent function to support parent-category fallback
-- When a transaction maps to 'utilities' or 'insurance' but no budget exists for those,
-- it should fall back to 'housing' (industry-standard 50/30/20 grouping)
CREATE OR REPLACE FUNCTION public.recalculate_budget_spent(p_budget_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget record;
  v_total_spent numeric;
  v_budget_category budget_category;
  v_has_specific_budget boolean;
BEGIN
  -- Get budget info
  SELECT id, user_id, category, start_date INTO v_budget 
  FROM budgets WHERE id = p_budget_id;
  
  IF v_budget IS NULL THEN RETURN; END IF;
  
  v_budget_category := v_budget.category;
  
  -- Calculate spent from transactions table for exact category match
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM transactions
  WHERE user_id = v_budget.user_id
    AND type = 'expense'
    AND map_transaction_to_budget_category(category, type) = v_budget_category
    AND transaction_date >= v_budget.start_date
    AND transaction_date < v_budget.start_date + interval '1 month';
  
  -- Parent-category fallback: if this is a 'housing' budget, also capture
  -- utilities, insurance that don't have their own dedicated budget
  IF v_budget_category = 'housing' THEN
    -- Check for sub-categories that should roll up if no dedicated budget exists
    DECLARE
      sub_cat budget_category;
      sub_cats budget_category[] := ARRAY['utilities'::budget_category, 'insurance'::budget_category];
    BEGIN
      FOREACH sub_cat IN ARRAY sub_cats LOOP
        -- Only roll up if user has NO active budget for this specific sub-category
        SELECT EXISTS(
          SELECT 1 FROM budgets 
          WHERE user_id = v_budget.user_id 
            AND category = sub_cat 
            AND is_active = true
            AND id != p_budget_id
        ) INTO v_has_specific_budget;
        
        IF NOT v_has_specific_budget THEN
          SELECT v_total_spent + COALESCE(SUM(amount), 0) INTO v_total_spent
          FROM transactions
          WHERE user_id = v_budget.user_id
            AND type = 'expense'
            AND map_transaction_to_budget_category(category, type) = sub_cat
            AND transaction_date >= v_budget.start_date
            AND transaction_date < v_budget.start_date + interval '1 month';
        END IF;
      END LOOP;
    END;
  END IF;
  
  -- Similarly for 'entertainment' budget, capture 'personal' if no dedicated budget
  IF v_budget_category = 'entertainment' THEN
    SELECT EXISTS(
      SELECT 1 FROM budgets 
      WHERE user_id = v_budget.user_id 
        AND category = 'personal' 
        AND is_active = true
        AND id != p_budget_id
    ) INTO v_has_specific_budget;
    
    IF NOT v_has_specific_budget THEN
      SELECT v_total_spent + COALESCE(SUM(amount), 0) INTO v_total_spent
      FROM transactions
      WHERE user_id = v_budget.user_id
        AND type = 'expense'
        AND map_transaction_to_budget_category(category, type) = 'personal'
        AND transaction_date >= v_budget.start_date
        AND transaction_date < v_budget.start_date + interval '1 month';
    END IF;
  END IF;
  
  -- Add any budget_transactions
  SELECT v_total_spent + COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM budget_transactions
  WHERE budget_id = p_budget_id;
  
  -- Update budget spent
  UPDATE budgets SET spent = v_total_spent, updated_at = now() 
  WHERE id = p_budget_id;
END;
$function$;

-- Also update the sync_transaction_to_budget trigger function to handle parent fallback
CREATE OR REPLACE FUNCTION public.sync_transaction_to_budget()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget_category budget_category;
  v_budget_id uuid;
  v_parent_category budget_category;
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.type = 'expense' THEN
      v_budget_category := map_transaction_to_budget_category(NEW.category, NEW.type);
      
      IF v_budget_category IS NOT NULL THEN
        -- Find matching active budget (exact category)
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
        ELSE
          -- Fallback: if category is utilities/insurance, try housing parent
          IF v_budget_category IN ('utilities', 'insurance') THEN
            v_parent_category := 'housing';
          ELSIF v_budget_category = 'personal' THEN
            v_parent_category := 'entertainment';
          ELSE
            v_parent_category := NULL;
          END IF;
          
          IF v_parent_category IS NOT NULL THEN
            SELECT id INTO v_budget_id
            FROM budgets
            WHERE user_id = NEW.user_id
              AND category = v_parent_category
              AND is_active = true
              AND NEW.transaction_date >= start_date
            ORDER BY start_date DESC
            LIMIT 1;
            
            IF v_budget_id IS NOT NULL THEN
              PERFORM recalculate_budget_spent(v_budget_id);
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
    
    -- For UPDATE, also recalc old category if changed
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
        ELSE
          -- Fallback to parent
          IF v_budget_category IN ('utilities', 'insurance') THEN
            v_parent_category := 'housing';
          ELSIF v_budget_category = 'personal' THEN
            v_parent_category := 'entertainment';
          ELSE
            v_parent_category := NULL;
          END IF;
          
          IF v_parent_category IS NOT NULL THEN
            SELECT id INTO v_budget_id
            FROM budgets
            WHERE user_id = OLD.user_id
              AND category = v_parent_category
              AND is_active = true
            LIMIT 1;
            
            IF v_budget_id IS NOT NULL THEN
              PERFORM recalculate_budget_spent(v_budget_id);
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Now recalculate all active budgets with the improved logic
DO $$
DECLARE
  b record;
BEGIN
  FOR b IN SELECT id FROM budgets WHERE is_active = true
  LOOP
    PERFORM recalculate_budget_spent(b.id);
  END LOOP;
END $$;
