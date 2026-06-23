-- Fix 1: Add INSERT policy for profiles table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Fix 2: Create a view that hides the raw access token from plaid_items
CREATE OR REPLACE VIEW public.plaid_items_safe AS
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
  -- Mask the access token - only show if it's in vault
  CASE 
    WHEN vault_secret_id IS NOT NULL THEN 'ENCRYPTED_IN_VAULT'
    ELSE 'LEGACY_TOKEN_NEEDS_MIGRATION'
  END as token_status
FROM public.plaid_items;

-- Grant access to the safe view
GRANT SELECT ON public.plaid_items_safe TO authenticated;

-- Add comment explaining security
COMMENT ON VIEW public.plaid_items_safe IS 'Safe view of plaid_items that hides raw access tokens. Use get_plaid_token() function to retrieve tokens securely.';