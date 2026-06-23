
-- Add source_recurring_id to track which recurring template created an auto-confirmed transaction
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS source_recurring_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Add a unique index to prevent the same recurring template from auto-confirming twice in the same month
-- We use a functional index on (user_id, source_recurring_id, year-month of transaction_date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_dedup
ON public.transactions (user_id, source_recurring_id, (date_trunc('month', transaction_date::timestamp)))
WHERE source_recurring_id IS NOT NULL;

-- Add unique constraint on family_links to prevent duplicate parent-kid links
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_links_unique_pair
ON public.family_links (parent_user_id, kid_profile_id)
WHERE status = 'active';

-- Add unique constraint on event_reminders to prevent duplicate reminders
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_reminders_unique
ON public.event_reminders (user_id, event_id);
