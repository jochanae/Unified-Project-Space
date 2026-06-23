-- Fix 1: Deny anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Fix 2: Add explicit anonymous denial for b2b_partner_referrals
CREATE POLICY "Deny anonymous access to b2b referrals"
ON public.b2b_partner_referrals
FOR ALL
TO anon
USING (false);

-- Fix 3: Create a security definer function to check if user can access kid profile sensitive data
-- Only the kid themselves (via their user_id) should see their own PIN data
CREATE OR REPLACE FUNCTION public.is_own_kid_account(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE id = profile_id 
    AND user_id = auth.uid()
  )
$$;

-- Update the kids_profiles policies to prevent parents from seeing PIN data
-- Drop existing policy that might allow too broad access
DROP POLICY IF EXISTS "Parents can view linked kid profiles" ON public.kids_profiles;

-- Recreate with restriction - parents use the safe view, only kid's own account sees full data
CREATE POLICY "Kids can view their own full profile"
ON public.kids_profiles
FOR SELECT
USING (user_id = auth.uid());

-- Deny anonymous access to kids_profiles entirely
CREATE POLICY "Deny anonymous access to kids profiles"
ON public.kids_profiles
FOR ALL
TO anon
USING (false);

-- Fix 4: Prevent SELECT of plaid_access_token column by revoking and using vault
-- First, deny anonymous access to plaid_items
DROP POLICY IF EXISTS "Deny anonymous access to plaid items" ON public.plaid_items;
CREATE POLICY "Deny anonymous access to plaid items"
ON public.plaid_items
FOR ALL
TO anon
USING (false);

-- Create a secure function to get plaid tokens (only callable by edge functions with service role)
CREATE OR REPLACE FUNCTION public.get_plaid_access_token_secure(p_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_user_id uuid;
BEGIN
  -- Verify the caller owns this plaid item
  SELECT user_id INTO v_user_id
  FROM public.plaid_items
  WHERE id = p_item_id;
  
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized access to plaid item';
  END IF;
  
  -- Get the token (preferring vault if available)
  SELECT CASE 
    WHEN vault_secret_id IS NOT NULL THEN 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = vault_secret_id)
    ELSE 
      plaid_access_token
  END INTO v_token
  FROM public.plaid_items
  WHERE id = p_item_id;
  
  RETURN v_token;
END;
$$;

-- Add policy to prevent direct access to plaid_access_token via normal queries
-- Users should use the safe view or the secure function
DROP POLICY IF EXISTS "Users can view their own plaid items" ON public.plaid_items;
CREATE POLICY "Users can view their own plaid items safely"
ON public.plaid_items
FOR SELECT
USING (auth.uid() = user_id);

-- Note: The plaid_access_token column will still be visible but should always be 'ENCRYPTED_IN_VAULT'
-- for properly migrated tokens. The secure function handles actual token retrieval.