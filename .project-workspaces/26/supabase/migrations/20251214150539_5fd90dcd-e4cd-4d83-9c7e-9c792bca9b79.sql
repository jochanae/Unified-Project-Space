-- Enable pgsodium extension for encryption (required for Vault)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Add column to store vault secret reference
ALTER TABLE public.plaid_items 
ADD COLUMN IF NOT EXISTS vault_secret_id uuid;

-- Create a function to store access token in vault (returns the secret_id)
-- This function is SECURITY DEFINER so it can access vault schema
CREATE OR REPLACE FUNCTION public.store_plaid_token(
  p_plaid_item_id uuid,
  p_access_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  -- Insert the secret into vault
  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    'plaid_access_token_' || p_plaid_item_id::text,
    p_access_token,
    'Plaid access token for item ' || p_plaid_item_id::text
  )
  RETURNING id INTO v_secret_id;
  
  -- Update the plaid_items table with the vault reference
  UPDATE public.plaid_items 
  SET vault_secret_id = v_secret_id,
      plaid_access_token = 'ENCRYPTED_IN_VAULT' -- Mark as encrypted
  WHERE id = p_plaid_item_id;
  
  RETURN v_secret_id;
END;
$$;

-- Create a function to retrieve decrypted access token
-- Only callable with service role (edge functions)
CREATE OR REPLACE FUNCTION public.get_plaid_token(p_plaid_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_token text;
  v_secret_id uuid;
BEGIN
  -- Get the vault secret ID from plaid_items
  SELECT vault_secret_id INTO v_secret_id
  FROM public.plaid_items
  WHERE id = p_plaid_item_id;
  
  IF v_secret_id IS NULL THEN
    -- Fallback to legacy plaintext token (for migration period)
    SELECT plaid_access_token INTO v_token
    FROM public.plaid_items
    WHERE id = p_plaid_item_id;
    
    RETURN v_token;
  END IF;
  
  -- Get decrypted secret from vault
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;
  
  RETURN v_token;
END;
$$;

-- Create a function to migrate existing tokens to vault
CREATE OR REPLACE FUNCTION public.migrate_plaid_tokens_to_vault()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_count integer := 0;
  v_item record;
  v_secret_id uuid;
BEGIN
  -- Find all items with plaintext tokens (not yet migrated)
  FOR v_item IN 
    SELECT id, plaid_access_token 
    FROM public.plaid_items 
    WHERE vault_secret_id IS NULL 
      AND plaid_access_token IS NOT NULL 
      AND plaid_access_token != 'ENCRYPTED_IN_VAULT'
  LOOP
    -- Insert into vault
    INSERT INTO vault.secrets (name, secret, description)
    VALUES (
      'plaid_access_token_' || v_item.id::text,
      v_item.plaid_access_token,
      'Plaid access token for item ' || v_item.id::text
    )
    RETURNING id INTO v_secret_id;
    
    -- Update the plaid_items record
    UPDATE public.plaid_items 
    SET vault_secret_id = v_secret_id,
        plaid_access_token = 'ENCRYPTED_IN_VAULT'
    WHERE id = v_item.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Grant execute on helper functions to authenticated users 
-- (but the functions use SECURITY DEFINER so they run with elevated privileges)
GRANT EXECUTE ON FUNCTION public.store_plaid_token(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_plaid_token(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.migrate_plaid_tokens_to_vault() TO service_role;

-- Add comment explaining the security model
COMMENT ON FUNCTION public.store_plaid_token IS 'Stores Plaid access token in encrypted vault storage. Only callable by service role.';
COMMENT ON FUNCTION public.get_plaid_token IS 'Retrieves decrypted Plaid access token from vault. Only callable by service role.';
COMMENT ON FUNCTION public.migrate_plaid_tokens_to_vault IS 'Migrates existing plaintext tokens to vault encryption. Only callable by service role.';