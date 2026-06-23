
-- Fix existing budget spent totals to match budget_transactions
UPDATE budgets b
SET spent = COALESCE(
  (SELECT SUM(bt.amount) FROM budget_transactions bt WHERE bt.budget_id = b.id),
  0
);

-- Create trigger to auto-update budget spent when budget_transactions change
CREATE OR REPLACE FUNCTION public.update_budget_spent_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE budgets SET spent = COALESCE(
      (SELECT SUM(amount) FROM budget_transactions WHERE budget_id = NEW.budget_id), 0
    ) WHERE id = NEW.budget_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE budgets SET spent = COALESCE(
      (SELECT SUM(amount) FROM budget_transactions WHERE budget_id = NEW.budget_id), 0
    ) WHERE id = NEW.budget_id;
    IF OLD.budget_id != NEW.budget_id THEN
      UPDATE budgets SET spent = COALESCE(
        (SELECT SUM(amount) FROM budget_transactions WHERE budget_id = OLD.budget_id), 0
      ) WHERE id = OLD.budget_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE budgets SET spent = COALESCE(
      (SELECT SUM(amount) FROM budget_transactions WHERE budget_id = OLD.budget_id), 0
    ) WHERE id = OLD.budget_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_budget_spent ON budget_transactions;
CREATE TRIGGER trigger_update_budget_spent
  AFTER INSERT OR UPDATE OR DELETE ON budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_spent_on_transaction();
