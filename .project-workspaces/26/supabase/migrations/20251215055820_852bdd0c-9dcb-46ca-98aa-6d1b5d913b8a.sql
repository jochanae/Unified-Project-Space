-- Strengthen RLS policies with explicit null checks
DROP POLICY IF EXISTS "Users can view their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can create their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can update their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can delete their own plaid items" ON public.plaid_items;

CREATE POLICY "Users can view their own plaid items"
ON public.plaid_items
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own plaid items"
ON public.plaid_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own plaid items"
ON public.plaid_items
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own plaid items"
ON public.plaid_items
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Revoke anonymous access
REVOKE ALL ON public.plaid_items FROM anon;

-- Create trigger to automatically encrypt tokens on insert/update
CREATE OR REPLACE FUNCTION public.auto_encrypt_plaid_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  -- Only process if there's a plaintext token that isn't already marked as encrypted
  IF NEW.plaid_access_token IS NOT NULL 
     AND NEW.plaid_access_token != 'ENCRYPTED_IN_VAULT'
     AND NEW.vault_secret_id IS NULL THEN
    
    -- Store in vault
    INSERT INTO vault.secrets (name, secret, description)
    VALUES (
      'plaid_access_token_' || NEW.id::text,
      NEW.plaid_access_token,
      'Plaid access token for item ' || NEW.id::text
    )
    RETURNING id INTO v_secret_id;
    
    -- Update the record to reference vault and clear plaintext
    NEW.vault_secret_id := v_secret_id;
    NEW.plaid_access_token := 'ENCRYPTED_IN_VAULT';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-encryption
DROP TRIGGER IF EXISTS encrypt_plaid_token_on_insert ON public.plaid_items;
CREATE TRIGGER encrypt_plaid_token_on_insert
BEFORE INSERT OR UPDATE ON public.plaid_items
FOR EACH ROW
EXECUTE FUNCTION public.auto_encrypt_plaid_token();

-- Add security comment
COMMENT ON TABLE public.plaid_items IS 'Plaid integration items. Access tokens are automatically encrypted to Supabase Vault. Use get_plaid_token() to retrieve tokens securely.';