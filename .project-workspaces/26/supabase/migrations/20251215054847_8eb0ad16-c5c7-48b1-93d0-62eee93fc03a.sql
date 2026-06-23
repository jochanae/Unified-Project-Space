-- Fix security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.plaid_items_safe;

CREATE VIEW public.plaid_items_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  plaid_item_id,
  institution_name,
  institution_id,
  status,
  created_at,
  updated_at,
  vault_secret_id,
  CASE 
    WHEN vault_secret_id IS NOT NULL THEN 'ENCRYPTED_IN_VAULT'
    ELSE 'LEGACY_TOKEN_NEEDS_MIGRATION'
  END as token_status
FROM public.plaid_items;

GRANT SELECT ON public.plaid_items_safe TO authenticated;

COMMENT ON VIEW public.plaid_items_safe IS 'Safe view of plaid_items that hides raw access tokens. Use get_plaid_token() function to retrieve tokens securely.';