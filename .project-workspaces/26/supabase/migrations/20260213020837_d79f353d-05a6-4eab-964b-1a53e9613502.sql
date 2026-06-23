
-- Add vault_secret_id columns (idempotent)
ALTER TABLE public.gmail_connections 
  ADD COLUMN IF NOT EXISTS access_token_vault_id UUID,
  ADD COLUMN IF NOT EXISTS refresh_token_vault_id UUID;

-- Recreate the trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.auto_encrypt_gmail_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_access_secret_id uuid;
  v_refresh_secret_id uuid;
BEGIN
  IF NEW.access_token IS NOT NULL 
     AND NEW.access_token != 'ENCRYPTED_IN_VAULT'
     AND NEW.access_token_vault_id IS NULL THEN
    INSERT INTO vault.secrets (name, secret, description)
    VALUES ('gmail_access_token_' || NEW.id::text, NEW.access_token, 'Gmail access token')
    RETURNING id INTO v_access_secret_id;
    NEW.access_token_vault_id := v_access_secret_id;
    NEW.access_token := 'ENCRYPTED_IN_VAULT';
  END IF;

  IF NEW.refresh_token IS NOT NULL 
     AND NEW.refresh_token != 'ENCRYPTED_IN_VAULT'
     AND NEW.refresh_token_vault_id IS NULL THEN
    INSERT INTO vault.secrets (name, secret, description)
    VALUES ('gmail_refresh_token_' || NEW.id::text, NEW.refresh_token, 'Gmail refresh token')
    RETURNING id INTO v_refresh_secret_id;
    NEW.refresh_token_vault_id := v_refresh_secret_id;
    NEW.refresh_token := 'ENCRYPTED_IN_VAULT';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS encrypt_gmail_tokens_trigger ON public.gmail_connections;
CREATE TRIGGER encrypt_gmail_tokens_trigger
BEFORE INSERT OR UPDATE ON public.gmail_connections
FOR EACH ROW
EXECUTE FUNCTION public.auto_encrypt_gmail_tokens();

-- Secure retrieval function
CREATE OR REPLACE FUNCTION public.get_gmail_tokens_secure(p_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conn record;
  v_access text;
  v_refresh text;
BEGIN
  SELECT gc.access_token_vault_id, gc.refresh_token_vault_id,
         gc.access_token as raw_access, gc.refresh_token as raw_refresh
  INTO v_conn
  FROM public.gmail_connections gc
  WHERE gc.user_id = p_user_id AND gc.is_active = true;

  IF v_conn IS NULL THEN
    RAISE EXCEPTION 'Gmail connection not found';
  END IF;

  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: requires service role';
  END IF;

  IF v_conn.access_token_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_access FROM vault.decrypted_secrets WHERE id = v_conn.access_token_vault_id;
  ELSE
    v_access := v_conn.raw_access;
  END IF;

  IF v_conn.refresh_token_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_refresh FROM vault.decrypted_secrets WHERE id = v_conn.refresh_token_vault_id;
  ELSE
    v_refresh := v_conn.raw_refresh;
  END IF;

  RETURN QUERY SELECT v_access, v_refresh;
END;
$$;
