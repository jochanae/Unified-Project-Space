
-- Drop existing function first due to return type change
DROP FUNCTION IF EXISTS public.migrate_plaid_tokens_to_vault();

-- Create a function to migrate existing plaid tokens to vault
CREATE OR REPLACE FUNCTION public.migrate_plaid_tokens_to_vault()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_record RECORD;
  new_secret_id uuid;
BEGIN
  -- Loop through all plaid items that have a raw token but no vault secret
  FOR item_record IN 
    SELECT id, plaid_access_token 
    FROM public.plaid_items 
    WHERE plaid_access_token IS NOT NULL 
      AND plaid_access_token != 'ENCRYPTED_IN_VAULT'
      AND vault_secret_id IS NULL
  LOOP
    -- Insert the token into vault
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (
      item_record.plaid_access_token,
      'plaid_access_token_' || item_record.id::text,
      'Plaid access token for item ' || item_record.id::text
    )
    RETURNING id INTO new_secret_id;
    
    -- Update the plaid_items record to reference the vault secret
    -- and clear the raw token
    UPDATE public.plaid_items
    SET 
      vault_secret_id = new_secret_id,
      plaid_access_token = 'ENCRYPTED_IN_VAULT'
    WHERE id = item_record.id;
  END LOOP;
END;
$$;

-- Run the migration immediately
SELECT public.migrate_plaid_tokens_to_vault();

-- Create a trigger to automatically encrypt new tokens
CREATE OR REPLACE FUNCTION public.encrypt_plaid_token_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_secret_id uuid;
BEGIN
  -- Only process if there's a raw token and no vault secret
  IF NEW.plaid_access_token IS NOT NULL 
     AND NEW.plaid_access_token != 'ENCRYPTED_IN_VAULT'
     AND NEW.vault_secret_id IS NULL THEN
    
    -- Insert into vault
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (
      NEW.plaid_access_token,
      'plaid_access_token_' || NEW.id::text,
      'Plaid access token for item ' || NEW.id::text
    )
    RETURNING id INTO new_secret_id;
    
    -- Update the record
    NEW.vault_secret_id := new_secret_id;
    NEW.plaid_access_token := 'ENCRYPTED_IN_VAULT';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS encrypt_plaid_token_trigger ON public.plaid_items;

-- Create the trigger
CREATE TRIGGER encrypt_plaid_token_trigger
  BEFORE INSERT OR UPDATE ON public.plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_plaid_token_on_insert();

-- Create a secure view that never exposes the raw token (using correct column names)
DROP VIEW IF EXISTS public.plaid_items_safe;
CREATE VIEW public.plaid_items_safe AS
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

-- Update the secure token retrieval function
CREATE OR REPLACE FUNCTION public.get_plaid_access_token_secure(p_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_user_id uuid;
  v_vault_id uuid;
BEGIN
  SELECT user_id, vault_secret_id INTO v_user_id, v_vault_id
  FROM public.plaid_items
  WHERE id = p_item_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Plaid item not found';
  END IF;
  
  IF v_user_id != auth.uid() AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to plaid item';
  END IF;
  
  IF v_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_token
    FROM vault.decrypted_secrets
    WHERE id = v_vault_id;
  ELSE
    SELECT plaid_access_token INTO v_token
    FROM public.plaid_items
    WHERE id = p_item_id;
  END IF;
  
  RETURN v_token;
END;
$$;
