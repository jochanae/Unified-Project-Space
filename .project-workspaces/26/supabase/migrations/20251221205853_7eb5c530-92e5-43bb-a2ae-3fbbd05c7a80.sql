
-- Fix plaid_items - block direct SELECT to protect access token
DROP POLICY IF EXISTS "Users can view their own plaid items safely" ON public.plaid_items;
DROP POLICY IF EXISTS "Block direct table SELECT - use plaid_items_safe view" ON public.plaid_items;

-- Create restrictive policy - no direct SELECT allowed
CREATE POLICY "No direct SELECT - use plaid_items_safe view"
ON public.plaid_items
FOR SELECT
TO authenticated
USING (false);

-- Recreate safe view with proper structure
DROP VIEW IF EXISTS public.plaid_items_safe;

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
  CASE 
    WHEN vault_secret_id IS NOT NULL THEN 'ENCRYPTED'
    WHEN plaid_access_token = 'ENCRYPTED_IN_VAULT' THEN 'ENCRYPTED'
    WHEN plaid_access_token IS NOT NULL THEN 'LEGACY'
    ELSE 'NONE'
  END AS token_status
FROM public.plaid_items
WHERE auth.uid() = user_id;

-- Grant access
REVOKE ALL ON public.plaid_items_safe FROM anon;
REVOKE ALL ON public.plaid_items_safe FROM public;
GRANT SELECT ON public.plaid_items_safe TO authenticated;
