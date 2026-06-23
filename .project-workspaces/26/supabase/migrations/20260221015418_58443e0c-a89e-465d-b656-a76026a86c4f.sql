
-- Fix map_transaction_to_budget_category to properly map all bill categories
CREATE OR REPLACE FUNCTION public.map_transaction_to_budget_category(p_category text, p_type text)
RETURNS budget_category
LANGUAGE plpgsql
IMMUTABLE
AS $function$
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
  
  RETURN CASE 
    WHEN normalized IN ('food & groceries', 'food', 'groceries', 'dining', 'food___groceries') THEN 'food'::budget_category
    WHEN normalized IN ('housing/rent', 'housing', 'rent', 'mortgage', 'property_tax') THEN 'housing'::budget_category
    WHEN normalized = 'insurance' THEN 'insurance'::budget_category
    WHEN normalized IN ('credit cards', 'credit_cards', 'credit_card', 'debt payments', 'debt', 'student_loan', 'loans') THEN 'other'::budget_category
    WHEN normalized IN ('healthcare', 'medical') THEN 'other'::budget_category
    WHEN normalized = 'transportation' THEN 'transportation'::budget_category
    WHEN normalized IN ('utilities', 'internet', 'phone') THEN 'utilities'::budget_category
    WHEN normalized IN ('entertainment', 'subscriptions', 'subscription', 'streaming', 'gym') THEN 'entertainment'::budget_category
    WHEN normalized = 'shopping' THEN 'shopping'::budget_category
    WHEN normalized = 'education' THEN 'education'::budget_category
    WHEN normalized = 'travel' THEN 'travel'::budget_category
    WHEN normalized IN ('personal care', 'personal') THEN 'personal'::budget_category
    WHEN normalized IN ('charity', 'gifts') THEN 'gifts'::budget_category
    WHEN normalized = 'savings' THEN 'savings'::budget_category
    ELSE 'other'::budget_category
  END;
END;
$function$;

-- Force recalculate all active budgets
DO $$
DECLARE b record;
BEGIN
  FOR b IN SELECT id FROM budgets WHERE is_active = true AND user_id = 'ec93e449-21e9-45fe-a4c8-ec36806332b7'
  LOOP
    PERFORM recalculate_budget_spent(b.id);
  END LOOP;
END $$;
