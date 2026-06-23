
-- Drop any existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_sync_transaction_to_budget ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_budget_spent ON public.budget_transactions;
DROP TRIGGER IF EXISTS trigger_record_balance_snapshot ON public.accounts;
DROP TRIGGER IF EXISTS trigger_update_account_contributions ON public.account_contributions;
DROP TRIGGER IF EXISTS trigger_update_professional_rating ON public.professional_reviews;
DROP TRIGGER IF EXISTS trigger_check_budget_alerts ON public.budget_transactions;
DROP TRIGGER IF EXISTS trigger_auto_encrypt_plaid_token ON public.plaid_items;
DROP TRIGGER IF EXISTS trigger_auto_encrypt_gmail_tokens ON public.gmail_connections;
DROP TRIGGER IF EXISTS trigger_update_budgets_updated_at ON public.budgets;
DROP TRIGGER IF EXISTS trigger_update_goals_updated_at ON public.goals;
DROP TRIGGER IF EXISTS trigger_update_debts_updated_at ON public.debts;

-- 1. Sync transaction changes to budget spent
CREATE TRIGGER trigger_sync_transaction_to_budget
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transaction_to_budget();

-- 2. Sync budget_transactions changes to budget spent
CREATE TRIGGER trigger_update_budget_spent
  AFTER INSERT OR UPDATE OR DELETE ON public.budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_spent_on_transaction();

-- 3. Record balance snapshot on account update
CREATE TRIGGER trigger_record_balance_snapshot
  AFTER INSERT OR UPDATE OF balance ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.record_balance_snapshot();

-- 4. Update account total contributions
CREATE TRIGGER trigger_update_account_contributions
  AFTER INSERT OR UPDATE OR DELETE ON public.account_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_total_contributions();

-- 5. Update professional rating on review changes
CREATE TRIGGER trigger_update_professional_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_professional_rating();

-- 6. Check budget alerts on new budget transactions
CREATE TRIGGER trigger_check_budget_alerts
  AFTER INSERT ON public.budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_budget_alerts();

-- 7. Auto-encrypt plaid tokens
CREATE TRIGGER trigger_auto_encrypt_plaid_token
  BEFORE INSERT OR UPDATE ON public.plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_encrypt_plaid_token();

-- 8. Auto-encrypt gmail tokens
CREATE TRIGGER trigger_auto_encrypt_gmail_tokens
  BEFORE INSERT OR UPDATE ON public.gmail_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_encrypt_gmail_tokens();

-- 9. Updated_at triggers
CREATE TRIGGER trigger_update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Recalculate all active budget spent values from existing transactions
DO $$
DECLARE
  b record;
  v_total numeric;
BEGIN
  FOR b IN SELECT id, user_id, category, start_date, amount FROM budgets WHERE is_active = true
  LOOP
    SELECT COALESCE(SUM(t.amount), 0) INTO v_total
    FROM transactions t
    WHERE t.user_id = b.user_id
      AND t.type = 'expense'
      AND map_transaction_to_budget_category(t.category, t.type) = b.category
      AND t.transaction_date >= b.start_date
      AND t.transaction_date < b.start_date + interval '1 month';

    SELECT v_total + COALESCE(SUM(bt.amount), 0) INTO v_total
    FROM budget_transactions bt
    WHERE bt.budget_id = b.id;

    UPDATE budgets SET spent = v_total WHERE id = b.id;
  END LOOP;
END $$;
