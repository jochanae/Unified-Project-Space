-- Add remaining term months to debts table so payoff calculator can use actual contract end dates
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS remaining_term_months integer DEFAULT NULL;

COMMENT ON COLUMN public.debts.remaining_term_months IS 'Number of months remaining on the loan contract. Used by payoff strategy calculator to cap projections to actual loan terms.';
