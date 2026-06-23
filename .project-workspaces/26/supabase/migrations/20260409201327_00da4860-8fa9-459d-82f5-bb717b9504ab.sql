
-- Drop ALL encrypt triggers
DROP TRIGGER IF EXISTS trigger_auto_encrypt_gmail_tokens ON public.gmail_connections;
DROP TRIGGER IF EXISTS encrypt_gmail_tokens_trigger ON public.gmail_connections;

-- Set defaults first (no trigger fires for ALTER)
ALTER TABLE public.gmail_connections 
  ALTER COLUMN access_token SET DEFAULT 'ENCRYPTED_IN_VAULT',
  ALTER COLUMN refresh_token SET DEFAULT 'ENCRYPTED_IN_VAULT';

-- Now safely update without any trigger firing
UPDATE public.gmail_connections
SET access_token = 'ENCRYPTED_IN_VAULT'
WHERE access_token != 'ENCRYPTED_IN_VAULT'
  AND access_token_vault_id IS NOT NULL;

UPDATE public.gmail_connections
SET refresh_token = 'ENCRYPTED_IN_VAULT'
WHERE refresh_token != 'ENCRYPTED_IN_VAULT'
  AND refresh_token_vault_id IS NOT NULL;

-- Deactivate connections with plaintext but NO vault backup
UPDATE public.gmail_connections
SET is_active = false,
    access_token = 'EXPIRED',
    refresh_token = 'EXPIRED'
WHERE (access_token NOT IN ('ENCRYPTED_IN_VAULT', 'EXPIRED') AND access_token_vault_id IS NULL)
   OR (refresh_token NOT IN ('ENCRYPTED_IN_VAULT', 'EXPIRED') AND refresh_token_vault_id IS NULL);

-- Recreate the trigger
CREATE TRIGGER trigger_auto_encrypt_gmail_tokens
  BEFORE INSERT OR UPDATE ON public.gmail_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_encrypt_gmail_tokens();
