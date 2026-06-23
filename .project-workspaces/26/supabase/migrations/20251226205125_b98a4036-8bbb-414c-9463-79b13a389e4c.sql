-- Create a function to map transaction categories to budget categories
CREATE OR REPLACE FUNCTION public.map_transaction_to_budget_category(
  p_category text,
  p_type text
) RETURNS budget_category
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF p_category IS NULL THEN RETURN NULL; END IF;
  IF p_type = 'income' THEN RETURN NULL; END IF;
  
  normalized := lower(trim(p_category));
  
  -- Skip income categories
  IF normalized IN ('salary', 'freelance', 'investment', 'rental', 'gift', 
                    'private equity returns', 'hedge fund returns', 
                    'business sale proceeds', 'capital gains', 
                    'trust distribution', 'royalties & licensing', 
                    'bonus', 'refund') THEN
    RETURN NULL;
  END IF;
  
  -- Direct mapping
  RETURN CASE 
    WHEN normalized IN ('food & groceries', 'food', 'groceries', 'dining', 'food___groceries') THEN 'food'::budget_category
    WHEN normalized IN ('housing/rent', 'housing', 'rent') THEN 'housing'::budget_category
    WHEN normalized = 'insurance' THEN 'insurance'::budget_category
    WHEN normalized IN ('credit cards', 'credit_cards', 'debt payments', 'debt') THEN 'debt'::budget_category
    WHEN normalized = 'healthcare' THEN 'healthcare'::budget_category
    WHEN normalized = 'transportation' THEN 'transportation'::budget_category
    WHEN normalized = 'utilities' THEN 'utilities'::budget_category
    WHEN normalized IN ('entertainment', 'subscriptions', 'subscription') THEN 'entertainment'::budget_category
    WHEN normalized = 'shopping' THEN 'shopping'::budget_category
    WHEN normalized = 'education' THEN 'education'::budget_category
    WHEN normalized = 'travel' THEN 'travel'::budget_category
    WHEN normalized IN ('personal care', 'personal') THEN 'personal'::budget_category
    WHEN normalized IN ('charity', 'gifts') THEN 'gifts'::budget_category
    WHEN normalized = 'savings' THEN 'savings'::budget_category
    ELSE 'other'::budget_category
  END;
END;
$$;

-- Create a function to recalculate budget spent from transactions
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
  SELECT id, user_id, category INTO v_budget 
  FROM budgets WHERE id = p_budget_id;
  
  IF v_budget IS NULL THEN RETURN; END IF;
  
  -- Calculate spent from transactions table for this user/category
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM transactions
  WHERE user_id = v_budget.user_id
    AND type = 'expense'
    AND map_transaction_to_budget_category(category, type) = v_budget.category
    AND date >= (SELECT start_date FROM budgets WHERE id = p_budget_id)
    AND date < (SELECT start_date + interval '1 month' FROM budgets WHERE id = p_budget_id);
  
  -- Add any budget_transactions
  SELECT v_total_spent + COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM budget_transactions
  WHERE budget_id = p_budget_id;
  
  -- Update budget spent
  UPDATE budgets SET spent = v_total_spent, updated_at = now() 
  WHERE id = p_budget_id;
END;
$$;

-- Create trigger function to auto-recalculate when transactions change
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
          AND NEW.date >= start_date
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

-- Create the trigger on transactions table
DROP TRIGGER IF EXISTS sync_transaction_to_budget_trigger ON transactions;
CREATE TRIGGER sync_transaction_to_budget_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_transaction_to_budget();

-- Also sync budget_transactions
CREATE OR REPLACE FUNCTION public.sync_budget_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalculate_budget_spent(NEW.budget_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recalculate_budget_spent(OLD.budget_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_budget_transaction_trigger ON budget_transactions;
CREATE TRIGGER sync_budget_transaction_trigger
  AFTER INSERT OR UPDATE OR DELETE ON budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_budget_transaction();