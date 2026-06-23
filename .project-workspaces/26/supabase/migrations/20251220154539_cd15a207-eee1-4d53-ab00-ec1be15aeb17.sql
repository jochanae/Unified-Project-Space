
-- Fix the security definer view warning by recreating with proper settings
DROP VIEW IF EXISTS public.plaid_items_safe;

-- Recreate view with SECURITY INVOKER (default, but explicit is better)
CREATE VIEW public.plaid_items_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  plaid_item_id,
  institution_id,
  institution_name,
  status,
  created_at,
  updated_at,
  vault_secret_id,
  CASE 
    WHEN vault_secret_id IS NOT NULL THEN 'ENCRYPTED_IN_VAULT'
    ELSE 'NOT_ENCRYPTED'
  END AS token_status
FROM public.plaid_items;

-- Grant access to the safe view
GRANT SELECT ON public.plaid_items_safe TO authenticated;
