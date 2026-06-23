-- Fix #1: Restrict linked_accounts SELECT - tokens should never be readable by client
-- The edge function uses service role so it bypasses RLS
DROP POLICY IF EXISTS "Users can view their own linked accounts metadata" ON public.linked_accounts;

CREATE POLICY "No direct client access to linked accounts"
ON public.linked_accounts
FOR SELECT
USING (false);

-- Fix #2: Restrict user_payment_info - hide stripe_customer_id from direct client access
-- Create a safe view without stripe_customer_id
CREATE OR REPLACE VIEW public.user_payment_info_safe
WITH (security_invoker = on) AS
SELECT id, user_id, created_at, updated_at
FROM public.user_payment_info;
